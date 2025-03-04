import type { UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import TextInputRow from "./components/TextInputRow";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useMemo, useState } from "react";
import _ from "lodash";
import CheckboxRow from "./components/CheckboxRow";

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
  const { config } = useConfig();
  const state = getNetworkBoxState(config);
  const [proxyNoticeDismissed, setProxyNoticeDismissed] = useState(false);

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
          {!proxyNoticeDismissed ? (
            <Container fluid className="mb-3">
              <div className="border border-info p-2">
                <span>
                  You are advised to use the same proxy settings in the provided
                  browser to ensure consistency of captured values.
                </span>
                <span className="flex-grow-1 text-align-right ps-2">
                  <a href="#" onClick={() => setProxyNoticeDismissed(true)}>
                    Dismiss
                  </a>
                </span>
              </div>
            </Container>
          ) : null}
          <Container fluid>
            <TextInputRow
              config={["request", "proxy.url"]}
              label="Proxy URL"
              helpTooltip="URL of proxy server"
              helpHasMoreInfo
            />
            <CheckboxRow
              config={["request", "proxy.reject.unauthorized.tls"]}
              label="Reject unauthorized TLS"
              helpTooltip="Reject servers with invalid certificates"
              helpHasMoreInfo
            />
          </Container>
        </Tab>
      </Tabs>
    );
  }, [state, proxyNoticeDismissed]);
}

export default NetworkBox;
