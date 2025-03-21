import type { UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import TextInputRow from "./components/TextInputRow";
import { Collapse, Container, Tab, Tabs } from "react-bootstrap";
import { useCallback, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import CheckboxRow from "./components/CheckboxRow";
import { useEditor } from "../contexts/EditorContextProvider";
import { showToast } from "../helpers/Toast";

interface NetworkBoxState {
  request: UIConfig["request"];
}

let oldState: NetworkBoxState | null = null;

function getNetworkBoxState(config: UIConfig): NetworkBoxState {
  const state: NetworkBoxState = {
    request: config["request"]
  };

  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

function NetworkBox() {
  const { config, setConfigValue } = useConfig();
  const { activeEditor } = useEditor();
  const state = getNetworkBoxState(config);
  const [showProxyNotice, setShowProxyNotice] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("applyProxyResult", (result) => {
        if (result.status === "success") {
          setConfigValue("support.data", "appliedProxySettings", {
            url: config.request["proxy.url"],
            rejectUnauthorizedTLS:
              config.request["proxy.reject.unauthorized.tls"]
          });
          setShowProxyNotice(false);
          showToast("success", "Proxy settings applied");
        } else {
          showToast("error", `Failed to apply proxy settings: ${result.error}`);
        }
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, [config]);

  const applyProxySettings = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    try {
      await window.mainAPI.invoke("applyProxy", activeEditor);
    } catch (error: unknown) {
      console.error(error);
    }
  }, [activeEditor]);

  const refreshProxyNoticeVisibility = useCallback(() => {
    const applied = config["support.data"].appliedProxySettings;
    const current = config["request"];
    if (applied.url.trim() === "" && current["proxy.url"].trim() === "") {
      setShowProxyNotice(false);
      return;
    }
    setShowProxyNotice(
      applied.url.trim() !== current["proxy.url"].trim() ||
        applied.rejectUnauthorizedTLS !==
          current["proxy.reject.unauthorized.tls"]
    );
  }, [
    config["support.data"].appliedProxySettings.url,
    config.request["proxy.url"],
    config["support.data"].appliedProxySettings.rejectUnauthorizedTLS,
    config.request["proxy.reject.unauthorized.tls"]
  ]);

  useEffect(() => {
    refreshProxyNoticeVisibility();
  }, [refreshProxyNoticeVisibility]);

  return useMemo(() => {
    return (
      <Tabs
        defaultActiveKey="network-requests"
        variant="underline"
        className="mb-2 py-1 px-3"
      >
        <Tab className="pb-2" eventKey="network-requests" title="Requests">
          <Container fluid>
            <TextInputRow
              type="number"
              config={["request", "max.retries"]}
              label="Max retries"
              helpTooltip="Maximum number of retries if a request or download fails."
              ariaLabel="Maximum number of retries"
            />
            <TextInputRow
              type="number"
              config={["request", "max.concurrent"]}
              label="Max concurrent downloads"
              helpTooltip="Maximum number of concurrent downloads."
              ariaLabel="Maximum concurrent downloads"
            />
            <TextInputRow
              type="number"
              config={["request", "min.time"]}
              label="Min time between requests"
              helpTooltip="Minimum time to wait between starting requests / downloads (milliseconds)."
              ariaLabel="Minimum time between requests"
            />
          </Container>
        </Tab>

        <Tab className="pb-2" eventKey="network-proxy" title="Proxy">
          <Collapse in={showProxyNotice}>
            <Container fluid className="mb-3">
              <div className="border border-info p-2">
                <span>Proxy settings changed.</span>
                <span className="flex-grow-1 text-align-right ps-2">
                  <a href="#" onClick={applyProxySettings}>
                    Apply
                  </a>
                </span>
              </div>
            </Container>
          </Collapse>
          <Container fluid>
            <TextInputRow
              config={["request", "proxy.url"]}
              label="Proxy URL"
              onChange={refreshProxyNoticeVisibility}
              helpTooltip="URL of proxy server"
              helpHasMoreInfo
            />
            <CheckboxRow
              config={["request", "proxy.reject.unauthorized.tls"]}
              label="Reject unauthorized TLS"
              onChange={refreshProxyNoticeVisibility}
              helpTooltip="Reject servers with invalid certificates"
              helpHasMoreInfo
            />
          </Container>
        </Tab>
      </Tabs>
    );
  }, [
    state,
    showProxyNotice,
    applyProxySettings,
    refreshProxyNoticeVisibility
  ]);
}

export default NetworkBox;
