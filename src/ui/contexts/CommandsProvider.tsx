import { useEditor } from "./EditorContextProvider";
import type {
  ExecUICommandParams,
  MainProcessRendererEvent,
  UICommand
} from "../../types/MainEvents";
import { createContext, useCallback, useContext, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import type { UIConfig, UIConfigSection } from "../../types/UIConfig";

export type CommandsContextValue = {
  [C in UICommand]: (...params: ExecUICommandParams<C>) => void;
} & {
  requestHelp: <S extends UIConfigSection>(
    section: S,
    prop: keyof UIConfig[S]
  ) => void;
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
  const { setActionPending } = useEditor();

  const startAction = useCallback(
    async (action: () => void, result: Promise<unknown>) => {
      setActionPending(true);
      action();
      await result;
      setActionPending(false);
    },
    [setActionPending]
  );

  const waitForSaveResult = useCallback(() => {
    return new Promise<void>((resolve) => {
      window.mainAPI.on(
        "saveResult",
        (result) => {
          if (!result.canceled && !result.hasError) {
            const editor = editors.find(
              (ed) => ed.id === result.config.editorId
            );
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
            toast("Config saved", {
              type: "success",
              position: "bottom-center",
              theme: "dark"
            });
          }
          resolve();
        },
        { once: true }
      );
    });
  }, [editors, setEditorProp]);

  const waitForOpenFileResult = useCallback(() => {
    return new Promise<void>((resolve) => {
      window.mainAPI.on(
        "openFileResult",
        (result) => {
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
          resolve();
        },
        { once: true }
      );
    });
  }, [editors, addEditor, setActiveEditor]);

  const waitForCloseEditorResult = useCallback(() => {
    return new Promise<void>((resolve) => {
      window.mainAPI.on(
        "closeEditorResult",
        (result) => {
          if (!result.canceled) {
            doCloseEditor(result.editor);
          }
          resolve();
        },
        { once: true }
      );
    });
  }, [doCloseEditor]);

  const waitForEvent = useCallback((eventName: MainProcessRendererEvent) => {
    return new Promise<void>((resolve) => {
      window.mainAPI.on(
        eventName,
        () => {
          resolve();
        },
        { once: true }
      );
    });
  }, []);

  const createEditor = useCallback(() => {
    window.mainAPI.emitMainEvent("newEditor");
  }, []);

  const openFile = useCallback(
    (filePath?: string) => {
      startAction(() => {
        window.mainAPI.emitMainEvent("openFile", editors, filePath);
      }, waitForOpenFileResult());
    },
    [startAction, editors, waitForOpenFileResult]
  );

  const closeActiveEditor = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    startAction(() => {
      window.mainAPI.emitMainEvent("closeEditor", activeEditor);
    }, waitForCloseEditorResult());
  }, [startAction, activeEditor, waitForCloseEditorResult]);

  const save = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    startAction(() => {
      window.mainAPI.emitMainEvent("save", activeEditor);
    }, waitForSaveResult());
  }, [activeEditor, setActionPending, startAction]);

  const saveAs = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    startAction(() => {
      window.mainAPI.emitMainEvent("saveAs", activeEditor);
    }, waitForSaveResult());
  }, [setActionPending, activeEditor, startAction]);

  const preview = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    startAction(() => {
      window.mainAPI.emitMainEvent("preview", activeEditor);
    }, waitForEvent("previewEnd"));
  }, [activeEditor]);

  const startDownload = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    startAction(() => {
      window.mainAPI.emitMainEvent("startDownload", activeEditor);
    }, waitForEvent("downloadProcessEnd"));
  }, [activeEditor]);

  const showHelpIcons = useCallback(
    (show: boolean) => {
      setShowHelpIcons(show);
    },
    [setShowHelpIcons]
  );

  const requestHelp = useCallback(
    <S extends UIConfigSection>(section: S, prop: keyof UIConfig[S]) => {
      startAction(() => {
        window.mainAPI.emitMainEvent("requestHelp", section, prop as never);
      }, waitForEvent("helpEnd"));
    },
    []
  );

  const showAbout = useCallback(() => {
    startAction(() => {
      window.mainAPI.emitMainEvent("requestAboutInfo");
    }, waitForEvent("aboutEnd"));
  }, []);

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
    showAbout
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
      <ToastContainer />
    </CommandsContext.Provider>
  );
};

const useCommands = () => useContext(CommandsContext);

export { useCommands, CommandsProvider };
