import type { Tier } from "../types/UIConfig";
import { PATREON_URL } from "./Constants";
import type { Page } from "puppeteer-core";
import type { URLAnalysis } from "patreon-dl";

const PAGE_PATHNAME_FORMATS = {
  postsByUser: [
    "/cw/[vanity]/[[...tab]]",
    "/[vanity]/[[...tab]]",
    "/c/[vanity]/[[...tab]]",
    "/cw/[vanity]/posts",
    "/[vanity]/posts",
    "/c/[vanity]/posts"
  ],
  post: ["/posts/[postId]"],
  postsByCollection: ["/collection/[collectionId]"],
  product: ["/[vanity]/shop/[productId]"]
};

interface JSONWithPageBootstrap {
  props: {
    pageProps: {
      bootstrapEnvelope: {
        pageBootstrap: object;
      };
    };
  };
  page?: string;
  query?: {
    vanity?: string;
    productId?: string; // {slug}-{id}
    postId?: string; // {slug}-{id}
    collectionId?: string; // {id}
  };
}

export interface PatreonPageAnalysis {
  normalizedURL: string | null;
  target: (URLAnalysis & { description: string }) | null;
  tiers: Tier[] | null;
}

export default class PatreonPageAnalyzer {
  static async analyze(
    page: Page,
    signal: AbortSignal
  ): Promise<PatreonPageAnalysis | null> {
    const json = await this.#getJSONWithPageBootstrap(page);
    if (!json) {
      return null;
    }
    if (signal.aborted) {
      console.debug("PatreonPageAnalyzer: aborted");
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }
    const { normalizedURL = null, target = null } =
      this.#analyzePage(json) || {};
    const tiers = this.#getTiers(json);
    return {
      normalizedURL,
      target,
      tiers
    };
  }

  static async #getJSONWithPageBootstrap(
    page: Page
  ): Promise<JSONWithPageBootstrap | null> {
    return await page.evaluate(() => {
      for (const script of document.getElementsByTagName("script")) {
        if (script.type === "application/json") {
          try {
            const json = JSON.parse(script.innerText);
            const bs = json?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap;
            if (bs && typeof bs === "object") {
              return json;
            }
          } catch (_e: unknown) {
            // Do nothing
          }
        }
      }
      return null;
    });
  }

  static #analyzePage(
    json: JSONWithPageBootstrap | null
  ): Pick<PatreonPageAnalysis, "normalizedURL" | "target"> | null {
    /**
     * Perform our own analysis based on pageBootStrap,
     * This gives more accurate result than patreon-dl's URLHelper.analyzeURL().
     * Unfortunately, we can't perform the same analysis in patreon-dl
     * because we don't have puppeteer there to provide pageBootstrap, and
     * using fetch() to grab contents from URL will in most cases return
     * a "Loading" page where code is then executed to provide the actual content,
     * or otherwise a Google captcha challenge triggered by bot detection.
     */
    const page = json?.page;
    if (!page || typeof page !== "string") {
      return null;
    }

    const { vanity, postId, collectionId, productId } =
      json.query && typeof json.query === "object" ? json.query : {};

    const __parseSlugId = (s: string) => {
      const match = /(.+)-(\d+)$/.exec(s);
      if (match?.length === 3) {
        return {
          slug: match[1],
          id: match[2]
        };
      }
      return { slug: null, id: null };
    };

    if (
      PAGE_PATHNAME_FORMATS.postsByUser.includes(page) &&
      typeof vanity === "string"
    ) {
      const an: URLAnalysis = {
        type: "postsByUser",
        vanity
      };
      return {
        normalizedURL: `${PATREON_URL}/${vanity}/posts`,
        target: {
          ...an,
          description: this.#getTargetDesc(an)
        }
      };
    }
    if (
      PAGE_PATHNAME_FORMATS.post.includes(page) &&
      typeof postId === "string"
    ) {
      const { slug, id } = __parseSlugId(postId);
      if (slug && id) {
        const an: URLAnalysis = {
          type: "post",
          postId: id,
          slug
        };
        return {
          normalizedURL: `${PATREON_URL}/posts/${postId}`,
          target: {
            ...an,
            description: this.#getTargetDesc(an)
          }
        };
      }
      return null;
    }
    if (
      PAGE_PATHNAME_FORMATS.postsByCollection.includes(page) &&
      typeof collectionId === "string"
    ) {
      const an: URLAnalysis = {
        type: "postsByCollection",
        collectionId
      };
      return {
        normalizedURL: `${PATREON_URL}/collection/${collectionId}`,
        target: {
          ...an,
          description: this.#getTargetDesc(an)
        }
      };
    }
    if (
      PAGE_PATHNAME_FORMATS.product.includes(page) &&
      typeof vanity === "string" &&
      typeof productId === "string"
    ) {
      const { slug, id } = __parseSlugId(productId);
      if (slug && id) {
        const an: URLAnalysis = {
          type: "product",
          productId: id,
          slug
        };
        return {
          normalizedURL: `${PATREON_URL}/${vanity}/shop/${productId}`,
          target: {
            ...an,
            description: this.#getTargetDesc(an)
          }
        };
      }
      return null;
    }
    return null;
  }

  static #getTargetDesc(target: URLAnalysis) {
    switch (target.type) {
      case "post":
        return `Post #${target.postId}`;
      case "postsByCollection":
        return `Posts in collection #${target.collectionId}`;
      case "postsByUser":
        return `Posts by user "${target.vanity}"`;
      case "postsByUserId":
        return `Posts by user #${target.userId}`;
      case "product":
        return `Product #${target.productId}`;
      default:
        return "";
    }
  }

  static #getTiersFromPageBootstrap(bs: object) {
    const campaign = Reflect.get(bs, "campaign");
    const rewards = campaign?.data?.relationships?.rewards?.data;
    const included = campaign?.included;
    if (!Array.isArray(rewards) || !Array.isArray(included)) {
      return undefined;
    }

    const ids = rewards.reduce<string[]>((result, value) => {
      if (
        value &&
        typeof value === "object" &&
        Reflect.get(value, "type") === "reward"
      ) {
        const id = Reflect.get(value, "id");
        if (id !== undefined && id !== null) {
          result.push(String(id));
        }
      }
      return result;
    }, []);

    const __parseTierTitle = (id: string, value: string | null) =>
      value || (id === "-1" ? "Public" : `Tier #${id}`);

    const tiers = ids.reduce<Tier[]>((result, id) => {
      included.forEach((inc) => {
        const incId =
          typeof inc === "object" && Reflect.has(inc, "id")
            ? String(inc.id)
            : null;
        if (incId === id && Reflect.get(inc, "type") === "reward") {
          const attr = Reflect.get(inc, "attributes");
          if (typeof attr === "object") {
            const title = __parseTierTitle(id, Reflect.get(attr, "title"));
            result.push({
              id,
              title
            });
          }
        }
      });
      return result;
    }, []);
    return tiers.length > 0 ? tiers : undefined;
  }

  static #getTiers(json: JSONWithPageBootstrap | null) {
    if (json) {
      return (
        this.#getTiersFromPageBootstrap(
          json.props.pageProps.bootstrapEnvelope.pageBootstrap
        ) || null
      );
    }
    return null;
  }
}
