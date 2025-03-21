import type { Editor } from "../../types/App";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";

interface EditorContextValue {
  editors: Editor[];
  activeEditor: Editor | null;
  addEditor: (editor: Editor) => void;
  setActiveEditor: (editor: Editor) => void;
  markEditorModified: (editor: Editor) => void;
  actionPending: boolean;
  setActionPending: (value: boolean) => void;
  setEditorProp: (
    editor: Editor,
    value: Partial<
      Pick<
        Editor,
        "name" | "filePath" | "modified" | "loadAlerts" | "promptOnSave"
      >
    >
  ) => void;
  closeEditor: (editor: Editor) => void;
  showHelpIcons: boolean;
  setShowHelpIcons: (value: boolean) => void;
}
const EditorContext = createContext({} as EditorContextValue);

const EditorContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [showHelpIcons, setShowHelpIcons] = useState(false);
  const [, setRefreshToken] = useState(new Date().getMilliseconds());

  const sendModifiedEditorsChangeEvent = useCallback(
    (override?: Editor[]) => {
      window.mainAPI.emitMainEvent("modifiedEditorsChange", {
        editors: (override || editors).filter((editor) => editor.modified)
      });
    },
    [editors]
  );

  const closeEditor = useCallback(
    (editor: Editor) => {
      const editorIndex =
        editors.findIndex((_editor) => _editor.id === editor.id) || 0;
      const editorsAfterRemove = editors.filter(
        (_editor) => _editor.id !== editor.id
      );
      const nextActiveEditor =
        editorsAfterRemove[editorIndex - 1] || editorsAfterRemove[0] || null;
      setEditors(editorsAfterRemove);
      setActiveEditor(nextActiveEditor);
      if (editor.modified) {
        // `editors` not yet updated - need to override that
        sendModifiedEditorsChangeEvent(editorsAfterRemove);
      }
    },
    [editors, sendModifiedEditorsChangeEvent]
  );

  const addEditor = useCallback(
    (editor: Editor) => {
      setEditors([...editors, editor]);
      setActiveEditor(editor);
    },
    [editors, setActiveEditor]
  );

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("editorCreated", (editor) => {
        addEditor(editor);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, [addEditor, editors]);

  useEffect(() => {
    window.mainAPI.emitMainEvent("activeEditorChange", {
      editor: activeEditor
    });
  }, [activeEditor]);

  const triggerRefresh = useCallback(() => {
    setRefreshToken(new Date().getMilliseconds());
  }, []);

  const setEditorProp = useCallback<EditorContextValue["setEditorProp"]>(
    (editor, values) => {
      const modifiedStateChanged =
        values.modified !== undefined && values.modified !== editor.modified;
      for (const [prop, value] of Object.entries(values)) {
        (editor as unknown as Record<string, typeof value>)[prop] = value;
      }
      if (modifiedStateChanged) {
        sendModifiedEditorsChangeEvent();
      }
      triggerRefresh();
    },
    [sendModifiedEditorsChangeEvent]
  );

  const markEditorModified = useCallback(
    (editor: Editor) => {
      setEditorProp(editor, { modified: true });
    },
    [setEditorProp]
  );

  if (!activeEditor) {
    document.title = "patreon-dl-gui";
  } else {
    document.title = `${activeEditor.name}${activeEditor.modified ? "*" : ""} - patreon-dl-gui`;
  }

  return (
    <EditorContext.Provider
      value={{
        editors,
        activeEditor,
        addEditor,
        setActiveEditor,
        markEditorModified,
        actionPending,
        setActionPending,
        setEditorProp,
        closeEditor,
        showHelpIcons,
        setShowHelpIcons
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

const useEditor = () => useContext(EditorContext);

export { useEditor, EditorContextProvider };
