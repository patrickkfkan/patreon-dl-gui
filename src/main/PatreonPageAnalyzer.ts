import type { Tier } from "./types/UIConfig";
import { PATREON_URL } from "./Constants";
import type { URLAnalysis } from "patreon-dl";
import { load as cheerioLoad } from "cheerio";
import PatreonDownloader from "patreon-dl";

// "Custom domain" paths and rules not fully tested.
// Included possible combinations just in case any of 
// them turns up.

const PAGE_PATHNAME_FORMATS = {
  postsByUser: [
    "/cw/[vanity]/[[...tab]]",
    "/[vanity]/[[...tab]]",
    "/c/[vanity]/[[...tab]]",
    "/cw/[vanity]/posts",
    "/[vanity]/posts",
    "/c/[vanity]/posts",
    // Custom domain
    "/cw/_customdomain/[[...tab]]",
    "/_customdomain/[[...tab]]",
    "/c/_customdomain/[[...tab]]",
    "/cw/_customdomain/posts",
    "/_customdomain/posts",
    "/c/_customdomain/posts"
  ],
  post: [
    "/posts/[postId]",
    // Custom domain
    "/_customdomain/posts/[postId]"
  ],
  postsByCollection: [
    "/collection/[collectionId]",
    // Custom domain
    "/_customdomain/collection/[collectionId]"
  ],
  product: [
    "/[vanity]/shop/[productId]",
    // Custom domain
    "/_customdomain/shop/[productId]"
  ]
};

const URL_RULES = {
  postsByUser: [
    "/cw/\\u003cstring:vanity\\u003e/posts",
    // Custom domain
    "/_customdomain/posts"
  ]
}

type PageAnalysis = Pick<
    PatreonPageAnalysis & { status: "complete" },
    "normalizedURL" | "target"
  >;

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
    u?: string;
    productId?: string; // {slug}-{id}
    postId?: string; // {slug}-{id}
    collectionId?: string; // {id}
  };
}

export type PatreonPageAnalysis =
  | {
      status: "complete";
      normalizedURL: string | null;
      target: (URLAnalysis & { description: string }) | null;
      tiers: Tier[] | null;
    }
  | {
      status: "bootstrapNotFound";
    };

export default class PatreonPageAnalyzer {
  static async isPatreonPage(html: string) {
    const $ = cheerioLoad(html);
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const script of scripts) {
      const scriptContent = $(script).html();
      if (scriptContent) {
        try {
          const json = JSON.parse(scriptContent);
          if (
            json["@context"] === "http://schema.org/" &&
            json["@type"] === "Organization" &&
            json["name"] === "Patreon" &&
            json["url"] === 'http://www.patreon.com'
          ) {
            return true;
          }
        }
        catch (_) {
          // Do nothing
        }
      }
    }
    return false;
  }
  
  static async analyze(
    html: string,
    signal: AbortSignal
  ): Promise<PatreonPageAnalysis> {
    let an: PageAnalysis | null = null;
    let tiers: Tier[] | null = null;
    let bootstrapNotFound = false;
    const json = await this.#getJSONWithPageBootstrap(html);
    if (json) {
      an = this.#analyzePage(json);
      tiers = this.#getTiers(json);
    }
    else {
      const isNextJSStreamingResponse = html.includes('self.__next_f.push');
      if (isNextJSStreamingResponse) {
        an = this.#analyzeNextJSStreamingResponse(html);
        tiers = await this.#getTiersFromStreamingResponse(html);
        bootstrapNotFound = !an && !tiers;
      }
      else {
        bootstrapNotFound = true;
      }
    }
    if (signal.aborted) {
      console.debug("PatreonPageAnalyzer: aborted");
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }
    if (bootstrapNotFound) {
      return {
        status: 'bootstrapNotFound'
      };
    }
    return {
      status: "complete",
      normalizedURL: an?.normalizedURL || null,
      target: an?.target || null,
      tiers
    };
  }

  static async #getJSONWithPageBootstrap(
    html: string
  ): Promise<JSONWithPageBootstrap | null> {
    const $ = cheerioLoad(html);
    const scripts = $('script[id="__NEXT_DATA__"]').toArray();
    for (const scriptEl of scripts) {
      const script = $(scriptEl);
      if (script.attr("type") === "application/json") {
        try {
          const json = JSON.parse(script.text());
          const bs = json?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap;
          if (bs && typeof bs === "object") {
            return json;
          }
        } catch (_error: unknown) {
          // Do nothing
        }
      }
    }
    return null;
  }

  static #analyzePage(
    json: JSONWithPageBootstrap
  ): PageAnalysis | null {
    /**
     * Perform our own analysis based on pageBootStrap,
     * This gives more accurate result than patreon-dl's URLHelper.analyzeURL().
     * Unfortunately, we can't perform the same analysis in patreon-dl
     * because we don't have a browser there to capture pageBootstrap, and
     * using fetch() to grab contents from URL will in most cases return
     * a "Loading" page where code is then executed to provide the actual content,
     * or otherwise a Google captcha challenge triggered by bot detection.
     */
    const page = json.page;
    console.debug('PatreonPageAnalyzer: "page" value in bootstrap:', page);
    console.debug('PatreonPageAnalyzer: "query" value in bootstrap:', json.query);
    if (!page || typeof page !== "string") {
      return null;
    }

    const {
      vanity,
      u: userId,
      postId,
      collectionId,
      productId
    } = json.query && typeof json.query === "object" ? json.query : {};

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
      typeof userId === "string"
    ) {
      const an: URLAnalysis = {
        type: "postsByUserId",
        userId
      };
      return {
        normalizedURL: `${PATREON_URL}/user/posts?u=${userId}`,
        target: {
          ...an,
          description: this.#getTargetDesc(an)
        }
      };
    }
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

  static #analyzeNextJSStreamingResponse(html: string): PageAnalysis | null {
    const urlRuleRegex = /\\(?:\\?)"url_rule\\(?:\\?)":\\(?:\\?)"(.+?)\\(?:\\?)"/gm;
    const urlRuleMatch = urlRuleRegex.exec(html);
    const urlRule = urlRuleMatch && urlRuleMatch[1].replaceAll('\\\\', '\\');
    console.debug('PatreonPageAnalyzer: "url_rule" value in Next.js streaming response:', urlRule);
    if (!urlRule) {
      return null;
    }
    const vanityRegex = /\\(?:\\?)"vanity\\(?:\\?)":\\(?:\\?)"(.+?)\\(?:\\?)"/gm;
    const vanityMatch = vanityRegex.exec(html);
    const vanity = vanityMatch && vanityMatch[1];
    console.debug('PatreonPageAnalyzer: "vanity" value in Next.js streaming response:', vanity);
    if (URL_RULES.postsByUser.includes(urlRule) && vanity) {
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
    return null;
  }

  static async #getTiersFromStreamingResponse(html: string): Promise<Tier[] | null> {
    const campaignIdRegex = /campaign_id\\(?:\\?)",\\(?:\\?)"unit_id\\(?:\\?)":\\(?:\\?)"(.+?)\\(?:\\?)"/gm;
    const campaignIdMatch = campaignIdRegex.exec(html);
    const campaignId = campaignIdMatch && campaignIdMatch[1];
    if (!campaignId) {
      return null;
    }
    const campaign = await PatreonDownloader.getCampaign({ campaignId });
    if (campaign) {
      const __parseTierTitle = (id: string, value: string | null) =>
        value || (id === "-1" ? "Public" : `Tier #${id}`);
      return campaign?.rewards.map<Tier>((reward) => ({
        id: reward.id,
        title: __parseTierTitle(reward.id, reward.title)
      }));
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
          typeof inc === "object" && Reflect.has(inc, "id") ?
            String(inc.id)
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
