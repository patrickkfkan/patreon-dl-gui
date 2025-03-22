import { useEditor } from "./EditorContextProvider";
import type {
  ExecUICommandParams,
  SaveFileConfigResult,
  UICommand
} from "../../types/MainEvents";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import type { UIConfig, UIConfigSection } from "../../types/UIConfig";
import { showToast } from "../helpers/Toast";

export type CommandsContextValue = {
  [C in UICommand]: (...params: ExecUICommandParams<C>) => void;
} & {
  requestHelp: <S extends UIConfigSection>(
    section: S,
    prop: keyof UIConfig[S]
  ) => void;
  webBrowser: {
    gotoURL: (url: string) => void;
    gotoHome: () => void;
    goBack: () => void;
    goForward: () => void;
  };
};

const CommandsContext = createContext<CommandsContextValue>(
  {} as CommandsContextValue
);

const CommandsProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    editors,
    activeEditor,
    addEditor,
    setActiveEditor,
    closeEditor: doCloseEditor,
    setEditorProp,
    setShowHelpIcons
  } = useEditor();

  const handleSaveResult = useCallback(
    (result: SaveFileConfigResult) => {
      if (!result.canceled && !result.hasError) {
        const editor = editors.find((ed) => ed.id === result.config.editorId);
        if (editor) {
          setEditorProp(editor, {
            name: result.config.name,
            filePath: result.config.filePath,
            loadAlerts: undefined,
            modified: false,
            promptOnSave: false
          });
        } else {
          console.error(
            `No matching editor for ID ${result.config.editorId} in saveResult`
          );
        }
        showToast("success", "Config saved");
      }
    },
    [editors, setEditorProp]
  );

  const createEditor = useCallback(async () => {
    await window.mainAPI.invoke("newEditor");
  }, []);

  const openFile = useCallback(
    async (filePath?: string) => {
      const result = await window.mainAPI.invoke("openFile", editors, filePath);
      if (!result.canceled && !result.hasError) {
        const openedEditor = result.editor;
        if (result.isNewEditor) {
          addEditor(openedEditor);
        } else {
          const editor = editors.find((ed) => ed.id === openedEditor.id);
          if (editor) {
            setActiveEditor(editor);
          } else {
            console.error(
              `No matching editor for ID ${openedEditor.id} in openFileResult`
            );
          }
        }
      }
    },
    [editors, addEditor, setActiveEditor]
  );

  const closeActiveEditor = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    const result = await window.mainAPI.invoke("closeEditor", activeEditor);
    if (!result.canceled) {
      doCloseEditor(result.editor);
    }
  }, [activeEditor, doCloseEditor]);

  const save = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    const result = await window.mainAPI.invoke("save", activeEditor);
    handleSaveResult(result);
  }, [activeEditor, handleSaveResult]);

  const saveAs = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    const result = await window.mainAPI.invoke("saveAs", activeEditor);
    handleSaveResult(result);
  }, [activeEditor, handleSaveResult]);

  const preview = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    await window.mainAPI.invoke("preview", activeEditor);
  }, [activeEditor]);

  const startDownload = useCallback(async () => {
    if (!activeEditor) {
      return;
    }
    await window.mainAPI.invoke("startDownload", activeEditor);
  }, [activeEditor]);

  const showHelpIcons = useCallback(
    (show: boolean) => {
      setShowHelpIcons(show);
    },
    [setShowHelpIcons]
  );

  const requestHelp = useCallback(
    async <S extends UIConfigSection>(section: S, prop: keyof UIConfig[S]) => {
      await window.mainAPI.invoke("requestHelp", section, prop as never);
    },
    []
  );

  const showAbout = useCallback(async () => {
    await window.mainAPI.invoke("requestAboutInfo");
  }, []);

  const configureYouTube = useCallback(async () => {
    await window.mainAPI.invoke("configureYouTube");
  }, []);

  const webBrowser = useMemo(
    () => ({
      gotoURL: (url: string) => {
        window.mainAPI.invoke("setWebBrowserURL", url);
      },
      gotoHome: () => {
        window.mainAPI.invoke("setWebBrowserURLToHome");
      },
      goBack: () => {
        window.mainAPI.invoke("webBrowserBack");
      },
      goForward: () => {
        window.mainAPI.invoke("webBrowserForward");
      }
    }),
    []
  );

  const context = {
    createEditor,
    openFile,
    closeActiveEditor,
    preview,
    save,
    saveAs,
    startDownload,
    showHelpIcons,
    requestHelp,
    showAbout,
    configureYouTube,
    webBrowser
  };

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("execUICommand", (command, ...params) => {
        context[command](...(params as [never]));
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, [editors, setActiveEditor]);

  return (
    <CommandsContext.Provider value={context}>
      {children}
    </CommandsContext.Provider>
  );
};

const useCommands = () => useContext(CommandsContext);

export { useCommands, CommandsProvider };
