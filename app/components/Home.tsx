import * as React from 'react';
const { EditorKit, EditorKitDelegate } = require('sn-editor-kit');
const MarkdownIt = require('markdown-it');

const EditMode = 0;
const SplitMode = 1;
const PreviewMode = 2;

const modes = [
  { mode: EditMode, label: "Edit", css: "edit" },
  { mode: SplitMode, label: "Split", css: "split" },
  { mode: PreviewMode, label: "Preview", css: "preview" },
];

const markdownitOptions = {
  // automatically render raw links as anchors.
  linkify: true
};

const MarkdownParser = MarkdownIt(markdownitOptions)
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-task-lists'))
  .use(require('markdown-it-highlightjs'));

type AppProps = {
  text?: string,
  mode: number,
  label: string,
  css: string,
  platform?: 'desktop' | 'mobile',
}

const initialState = {
  mode: modes[0],
  text: "",
}
const debugMode = false;

let keyMap = new Map();

export class Home extends React.Component<{}, AppProps> {
  editorKit: any;
  note: any;

  constructor(props: AppProps) {
    super(props);
    this.state = {
      mode: modes[0].mode,
      label: modes[0].label,
      css: modes[0].css,
      text: "",
    };
  }

  componentDidMount = () => {
    this.configureEditorKit();
    this.configureMarkdown();
    this.configureResizer();
  }

  configureEditorKit() {
    const delegate = new EditorKitDelegate({
      setEditorRawText: (text: string) => {
        this.setState(
          {
            text,
          }, () => {
            this.updatePreviewText();
            this.loadSavedMode();
          });
      },
      clearUndoHistory: () => { },
      //getElementsBySelector: () => [],
    });

    this.editorKit = new EditorKit({
      delegate: delegate,
      mode: 'plaintext',
      supportsFilesafe: false,
    });
  };

  saveNote = () => {
    this.editorKit.onEditorValueChanged(this.state.text);
  }

  handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target.value;

    this.setState({
      text: value
    }, () => {
      this.updatePreviewText();
      this.saveNote();
    });
  };

  loadSavedMode = () => {
    try {
      const savedMode = this.editorKit.internal.componentManager.componentDataValueForKey("mode");
      if (savedMode) {
        this.setModeFromModeValue(savedMode);
      }
      this.setState({ platform: this.editorKit.internal.componentManager.platform });
    }
    finally {
      return
    }
  }

  setModeFromModeValue = (value: number) => {
    for (const mode of modes) {
      if (mode.mode === value) {
        if (debugMode) {
          console.log("setModeFromModeValue mode: " + mode.mode)
        }
        this.setState({ 
          mode: mode.mode,
          label: mode.label,
          css: mode.css
        });
        return;
      }
    }
  }

  changeMode = (mode: AppProps) => {
    this.setState({ 
      mode: mode.mode,
      label: mode.label,
      css: mode.css
    });
      if (debugMode) {
        console.log("changeMode mode: " + mode.mode)
      }
      this.editorKit.internal.componentManager.setComponentDataValueForKey("mode", mode.mode);
  }

  configureMarkdown = () => {
    // Remember old renderer, if overriden, or proxy to default renderer
    const defaultRender = MarkdownParser.renderer.rules.link_open || function (tokens: any , idx: any , options: any , env: any , self: any) {
      return self.renderToken(tokens, idx, options);
    };

    MarkdownParser.renderer.rules.link_open = function (tokens: any , idx: any , options: any , env: any , self: any ) {
      // If you are sure other plugins can't add `target` - drop check below
      let aIndex = tokens[idx].attrIndex('target');

      if (aIndex < 0) {
        tokens[idx].attrPush(['target', '_blank']); // add new attribute
      } else {
        tokens[idx].attrs[aIndex][1] = '_blank';    // replace value of existing attr
      }

      // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self);
    };
  }

  updatePreviewText = () => {
    const preview = document.getElementById("preview");
    if (preview) {
      preview.innerHTML = MarkdownParser.render(this.state.text);
    }
  }

  removeSelection = () => {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  configureResizer = () => {
    const simpleMarkdown = document.getElementById("simple-markdown");
    const editor = document.getElementById("editor");
    const columnResizer = document.getElementById("column-resizer");
    let pressed = false;
    let startWidth = editor.offsetWidth;
    let startX;
    let lastDownX;

    let resizerWidth = columnResizer.offsetWidth;
    let safetyOffset = 15;

    columnResizer.addEventListener("mousedown", (event) => {
      pressed = true;
      lastDownX = event.clientX;
      columnResizer.classList.add("dragging");
      editor.classList.add("no-selection");
    })

    document.addEventListener("mousemove", (event) => {
      if (!pressed) {
        return;
      }

      let x = event.clientX;
      if (x < resizerWidth / 2 + safetyOffset) {
        x = resizerWidth / 2 + safetyOffset;
      } else if (x > simpleMarkdown.offsetWidth - resizerWidth - safetyOffset) {
        x = simpleMarkdown.offsetWidth - resizerWidth - safetyOffset;
      }

      let colLeft = x - resizerWidth / 2;
      columnResizer.style.left = colLeft + "px";
      editor.style.width = (colLeft - safetyOffset) + "px";

      this.removeSelection();
    })

    document.addEventListener("mouseup", (event) => {
      if (pressed) {
        pressed = false;
        columnResizer.classList.remove("dragging");
        editor.classList.remove("no-selection");
      }
    })
  }

  onKeyDown = (event: React.KeyboardEvent) => {
    // Tab handler
    keyMap.set(event.key, true);
      if (!(keyMap.get('Shift')) && keyMap.get('Tab')) {
        event.preventDefault();
        document.execCommand("insertText", false, "\t");
      }
  }

  onKeyUp = (event: React.KeyboardEvent) => {
    keyMap.delete(event.key);
  }

  onBlur = () => {
    keyMap.clear();
  }

  render() {
    return (
      <div id="simple-markdown" className={"sn-component "+ this.state.platform} tabIndex={0}>
        <div id="header">
          <div className="segmented-buttons-container sk-segmented-buttons">
            <div className="buttons">
            {modes.map(mode =>
                <button onClick={() => this.changeMode(mode)} className={"sk-button button " + (this.state.mode === mode.mode ? "selected info" : "sk-secondary-contrast")}>
                  <div className="sk-label">
                    {mode.label}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
        <main id="editor-container" className={this.state.css}>
          <textarea 
          dir="auto" 
          id="editor" 
          spellCheck="true"
          className={this.state.css}
          value={this.state.text}
          onChange={this.handleInputChange}
          onKeyDown={this.onKeyDown}
          onKeyUp={this.onKeyUp}
          onBlur={this.onBlur}
          />
          <div id="column-resizer" className={this.state.css}></div>
          <section id="preview" className={this.state.css}></section>
        </main>
      </div>
    )
  }

}
