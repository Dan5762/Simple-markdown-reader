import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, drawSelection, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';

const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#18181b',
      color: '#d4d4d8',
    },
    '.cm-content': {
      caretColor: '#e4e4e7',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#e4e4e7',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: '#3f3f46',
      },
    '.cm-gutters': {
      backgroundColor: '#18181b',
      color: '#52525b',
      borderRight: '1px solid #27272a',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#27272a',
    },
    '.cm-activeLine': {
      backgroundColor: '#27272a40',
    },
  },
  { dark: true },
);

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track externally provided content to detect file switches
  const externalContentRef = useRef(content);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        darkTheme,
        lineNumbers(),
        history(),
        drawSelection(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        markdown({ codeLanguages: languages }),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            externalContentRef.current = value;
            onChangeRef.current(value);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor content when a different file is selected
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (content === externalContentRef.current) return;
    externalContentRef.current = content;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
  }, [content]);

  return <div ref={containerRef} className="flex-1 overflow-hidden" />;
}
