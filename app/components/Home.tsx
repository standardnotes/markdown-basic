import * as React from 'react';
const { EditorKit, EditorKitDelegate } = require('sn-editor-kit');
const MarkdownIt = require('markdown-it');

type Mode = {
  type: ModeType;
  label: string;
  css: string;
};

enum ModeType {
  Edit = 0,
  Split = 1,
  Preview = 2,
}

enum MouseEvent {
  Down = 'mousedown',
  Move = 'mousemove',
  Up = 'mouseup',
}

enum HtmlElementId {
  ColumnResizer = 'column-resizer',
  Editor = 'editor',
  EditorContainer = 'editor-container',
  Header = 'header',
  Preview = 'preview',
  SimpleMarkdown = 'simple-markdown',
}

enum CssClassList {
  Dragging = 'dragging',
  NoSelection = 'no-selection',
}

enum ComponentDataKey {
  Mode = 'mode',
}

const modes = [
  { type: ModeType.Edit, label: 'Edit', css: 'edit' } as Mode,
  { type: ModeType.Split, label: 'Split', css: 'split' } as Mode,
  { type: ModeType.Preview, label: 'Preview', css: 'preview' } as Mode,
];

/** 
 * MarkdownIt Options:
 * html option allows inline HTML
 * linkify option automatically renders raw links as anchors
 * breaks option creates new lines without trailing spaces
 */

const MarkdownItOptions = {
  html: true,
  linkify: true,
  breaks: true,
};

const MarkdownParser = MarkdownIt(MarkdownItOptions)
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-task-lists'))
  .use(require('markdown-it-highlightjs'));

type HomeState = {
  text?: string;
  mode: Mode;
  platform?: string;
};

const debugMode = false;

const keyMap = new Map();

export class Home extends React.Component<{}, HomeState> {
  editorKit: any;
  note: any;

  constructor(props: any) {
    super(props);
    this.state = {
      mode: modes[0],
      text: '',
    };
  }

  componentDidMount = () => {
    this.configureEditorKit();
    this.configureMarkdown();
    this.configureResizer();
  };

  truncateString = (string: string, limit = 80) => {
    if (!string) {
      return null;
    }
    if (string.length <= limit) {
      return string;
    } else {
      return string.substring(0, limit) + '...';
    }
  };

  configureEditorKit() {
    const delegate = new EditorKitDelegate({
      setEditorRawText: (text: string) => {
        this.setState(
          {
            text,
          },
          () => {
            this.updatePreviewText();
            this.loadSavedMode();
          }
        );
      },
      clearUndoHistory: () => { },
      getElementsBySelector: () => [] as any,
      generateCustomPreview: (text: string) => {
        this.updatePreviewText();
        const preview = document.getElementById(HtmlElementId.Preview);
        const previewText = this.truncateString(
          preview.textContent || preview.innerText
        );
        return {
          html: `<div>${previewText}</div>`,
          plain: previewText,
        };
      },
    });

    this.editorKit = new EditorKit({
      delegate: delegate,
      mode: 'plaintext',
      supportsFilesafe: false,
    });
  }

  saveNote = () => {
    this.editorKit.onEditorValueChanged(this.state.text);
  };

  handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target.value;

    this.setState(
      {
        text: value,
      },
      () => {
        this.saveNote();
        this.updatePreviewText();
      }
    );
  };

  loadSavedMode = () => {
    try {
      const savedMode = this.editorKit.internal.componentManager.componentDataValueForKey(
        ComponentDataKey.Mode
      );
      if (savedMode) {
        this.setModeFromModeType(savedMode);
      }
      this.setState({
        platform: this.editorKit.internal.componentManager.platform,
      });
    } catch { }
  };

  setModeFromModeType = (value: ModeType) => {
    for (const mode of modes) {
      if (mode.type === value) {
        this.logDebugMessage('setModeFromModeType mode: ', mode.type);
        this.setState(
          {
            mode,
          },
          () => {
            this.updatePreviewText();
          }
        );
        return;
      }
    }
  };

  changeMode = (mode: Mode) => {
    this.setState(
      {
        mode,
      },
      () => {
        this.updatePreviewText();
      }
    );
    this.logDebugMessage('changeMode mode: ', mode.type);
    this.editorKit.internal.componentManager.setComponentDataValueForKey(
      ComponentDataKey.Mode,
      mode.type
    );
  };

  configureMarkdown = () => {
    // Remember old renderer, if overriden, or proxy to default renderer
    const defaultRender =
      MarkdownParser.renderer.rules.link_open ||
      function (tokens: any, idx: any, options: any, env: any, self: any) {
        return self.renderToken(tokens, idx, options);
      };

    MarkdownParser.renderer.rules.link_open = function (
      tokens: any,
      idx: any,
      options: any,
      env: any,
      self: any
    ) {
      // If you are sure other plugins can't add `target` - drop check below
      const aIndex = tokens[idx].attrIndex('target');
      if (aIndex < 0) {
        tokens[idx].attrPush(['target', '_blank']); // add new attribute
      } else {
        tokens[idx].attrs[aIndex][1] = '_blank'; // replace value of existing attr
      }
      // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self);
    };
  };

  updatePreviewText = () => {
    const preview = document.getElementById(HtmlElementId.Preview);
    if (preview) {
      preview.innerHTML = MarkdownParser.render(this.state.text);
    }
  };

  removeSelection = () => {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  };

  configureResizer = () => {
    const simpleMarkdown = document.getElementById(
      HtmlElementId.SimpleMarkdown
    );
    const editor = document.getElementById(HtmlElementId.Editor);
    const columnResizer = document.getElementById(HtmlElementId.ColumnResizer);
    let pressed = false;
    let lastDownX;

    let resizerWidth = columnResizer.offsetWidth;
    let safetyOffset = 15;

    columnResizer.addEventListener(MouseEvent.Down, (event) => {
      pressed = true;
      lastDownX = event.clientX;
      columnResizer.classList.add(CssClassList.Dragging);
      editor.classList.add(CssClassList.NoSelection);
    });

    document.addEventListener(MouseEvent.Move, (event) => {
      if (!pressed) {
        return;
      }

      let x = event.clientX;
      if (x < resizerWidth / 2 + safetyOffset) {
        x = resizerWidth / 2 + safetyOffset;
      } else if (x > simpleMarkdown.offsetWidth - resizerWidth - safetyOffset) {
        x = simpleMarkdown.offsetWidth - resizerWidth - safetyOffset;
      }

      const colLeft = x - resizerWidth / 2;
      columnResizer.style.left = colLeft + 'px';
      editor.style.width = colLeft - safetyOffset + 'px';

      this.removeSelection();
    });

    document.addEventListener(MouseEvent.Up, (event) => {
      if (pressed) {
        pressed = false;
        columnResizer.classList.remove(CssClassList.Dragging);
        editor.classList.remove(CssClassList.NoSelection);
      }
    });
  };

  onKeyDown = (event: React.KeyboardEvent) => {
    keyMap.set(event.key, true);
    if (!keyMap.get('Shift') && keyMap.get('Tab')) {
      event.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  };

  onKeyUp = (event: React.KeyboardEvent) => {
    keyMap.delete(event.key);
  };

  onBlur = () => {
    keyMap.clear();
  };

  logDebugMessage = (message: string, object: any) => {
    if (debugMode) {
      console.log(message, object);
    }
  };

  render() {
    return (
      <div
        id={HtmlElementId.SimpleMarkdown}
        className={'sn-component ' + this.state.platform}
        tabIndex={0}
      >
        <div id={HtmlElementId.Header}>
          <div className="segmented-buttons-container sk-segmented-buttons">
            <div className="buttons">
              {modes.map((mode) => (
                <button
                  onClick={() => this.changeMode(mode)}
                  className={
                    'sk-button button ' +
                    (this.state.mode === mode
                      ? 'selected info'
                      : 'sk-secondary-contrast')
                  }
                >
                  <div className="sk-label">{mode.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <main
          id={HtmlElementId.EditorContainer}
          className={this.state.mode.css}
        >
          <textarea
            dir="auto"
            id={HtmlElementId.Editor}
            spellCheck="true"
            className={this.state.mode.css}
            value={this.state.text}
            onChange={this.handleInputChange}
            onKeyDown={this.onKeyDown}
            onKeyUp={this.onKeyUp}
            onBlur={this.onBlur}
          />
          <div
            id={HtmlElementId.ColumnResizer}
            className={this.state.mode.css}
          ></div>
          <section
            id={HtmlElementId.Preview}
            className={this.state.mode.css}
          ></section>
        </main>
      </div>
    );
  }
}
