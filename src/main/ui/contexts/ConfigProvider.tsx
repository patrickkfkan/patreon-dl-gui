import { useEditor } from "./EditorContextProvider";
import type {
  BrowserObtainableInput,
  UIConfig,
  UIConfigSection
} from "../../types/UIConfig";
import type { UnionToTuple } from "../../../common/types/Utility";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";
import _ from "lodash";

type SetConfigValueFn = <
  S extends UIConfigSection,
  P extends keyof UIConfig[S]
>(
  section: S,
  prop: P,
  value: UIConfig[S][P],
  _triggerRefresh?: boolean
) => void;

export interface ConfigContextValue {
  config: UIConfig;
  setConfigValue: SetConfigValueFn;
}
const ConfigContext = createContext<ConfigContextValue>(
  {} as ConfigContextValue
);

const isBrowserObtainableInput = (
  value: unknown
): value is BrowserObtainableInput => {
  const props: UnionToTuple<keyof BrowserObtainableInput> = [
    "inputMode",
    "browserValue",
    "manualValue"
  ];
  return (
    !!value &&
    typeof value === "object" &&
    props.every((prop) => Reflect.has(value, prop))
  );
};

const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { actionPending, activeEditor, markEditorModified } = useEditor();
  const [, setRefreshToken] = useState(new Date().getMilliseconds());

  const config = activeEditor?.config || null;

  const triggerRefresh = useCallback(() => {
    setRefreshToken(new Date().getMilliseconds());
  }, [activeEditor]);

  const setConfigValue = useCallback<SetConfigValueFn>(
    (section, prop, value, _triggerRefresh = true) => {
      if (!config || !activeEditor || _.isEqual(config[section][prop], value)) {
        return;
      }

      let markModified = !activeEditor.modified && section !== "support.data";
      if (
        markModified &&
        isBrowserObtainableInput(config[section][prop]) &&
        isBrowserObtainableInput(value)
      ) {
        if (
          config[section][prop].inputMode === "browser" &&
          value.inputMode === "browser"
        ) {
          // Do not mark modified if only the description has changed - this can happen when config has just been loaded
          // and only the browser value is set.
          markModified =
            config[section][prop].browserValue?.value !==
            value.browserValue?.value;
        } else if (
          config[section][prop].inputMode === "manual" &&
          value.inputMode === "manual"
        ) {
          markModified =
            config[section][prop].manualValue !== value.manualValue;
        }
      }

      config[section][prop] = value;

      if (markModified) {
        markEditorModified(activeEditor);
      }
      if (_triggerRefresh) {
        triggerRefresh();
      }
    },
    [config, triggerRefresh, markEditorModified, activeEditor]
  );

  useEffect(() => {
    const removeListenerCallbacks =
      config ?
        [
          window.mainAPI.on("browserPageInfo", (info) => {
            if (actionPending) {
              return;
            }
            setConfigValue("support.data", "browserObtainedValues", {
              ...config["support.data"].browserObtainedValues,
              target: {
                value: info.url || "",
                description: info.pageDescription
              },
              cookie: {
                value: info.cookie || "",
                description: info.cookieDescription
              },
              tiers: info.tiers
            });
            setConfigValue('support.data', 'bootstrapData', info.bootstrapData);
          })
        ]
      : [];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, [config, setConfigValue, triggerRefresh, actionPending]);

  useEffect(() => {}, [actionPending]);

  if (!config) {
    return null;
  }

  return (
    <ConfigContext.Provider value={{ config, setConfigValue }}>
      {children}
    </ConfigContext.Provider>
  );
};

const useConfig = () => useContext(ConfigContext);

export { useConfig, ConfigProvider };
