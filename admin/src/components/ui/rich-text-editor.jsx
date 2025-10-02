import React from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import "./rich-text-editor.css";

const ToolbarButton = ({ onClick, active, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      "px-2 py-1 rounded text-sm border",
      active
        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent"
        : "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
    )}
  >
    {children}
  </button>
);

const RichTextEditorBase = ({ className, value, onChange, placeholder, ...props }, ref) => {
  const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder: placeholder || "Write something...",
        }),
      ],
      content: value || "",
      onUpdate({ editor }) {
        const html = editor.getHTML();
        if (onChange) {
          onChange(html);
        }
      },
      editorProps: {
        attributes: {
          class:
            "min-h-[120px] border-0 px-3 py-2 bg-transparent text-[hsl(var(--foreground))] focus:outline-none editor-content",
        },
      },
    });

    // Sync external value changes without losing focus
    React.useEffect(() => {
      if (!editor) return;
      
      const currentContent = editor.getHTML();
      const newValue = value || "";
      
      // Only update if the content is actually different and editor is not focused
      if (currentContent !== newValue && !editor.isFocused) {
        editor.commands.setContent(newValue, false);
      }
    }, [value, editor]);

    if (!editor) {
      return (
        <div
          className={cn(
            "min-h-[120px] border border-[hsl(var(--border))] rounded-md px-3 py-2 bg-[hsl(var(--background))]",
            className
          )}
        />
      );
    }

    return (
      <div className={cn("rich-text-editor", className)} ref={ref} {...props}>
        <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-[hsl(var(--border))]">
          <ToolbarButton
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          >
            I
          </ToolbarButton>
          <ToolbarButton
            title="Strike"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
          >
            S
          </ToolbarButton>
          <ToolbarButton
            title="H1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            title="H2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="H3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            title="Bullet List"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            title="Ordered List"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            title="Quote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
          >
            “”
          </ToolbarButton>
          <ToolbarButton
            title="Code Block"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
          >
            {'</>>'}
          </ToolbarButton>
          <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
            Undo
          </ToolbarButton>
          <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
            Redo
          </ToolbarButton>
        </div>
        <div className="min-h-[120px] border border-[hsl(var(--border))] rounded-md overflow-hidden">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
};

const RichTextEditor = React.memo(React.forwardRef(RichTextEditorBase));
RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
