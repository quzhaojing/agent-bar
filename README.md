# Agent Bar - AI-Powered Text Enhancement Toolbar

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green)](https://github.com/quzhaojing/agent-bar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Plasmo Framework](https://img.shields.io/badge/Plasmo-Framework-blue)](https://plasmo.com/)

A smart browser extension that provides AI-powered text processing and enhancement capabilities through configurable toolbars. Agent Bar integrates with multiple LLM providers to offer intelligent text manipulation directly on any webpage.

## ✨ Features

### 🤖 Multi-LLM Provider Support
- **OpenAI** (GPT series)
- **Anthropic Claude**
- **Google Gemini**
- **DeepSeek**
- **Alibaba Tongyi Qwen**
- **Zhipu GLM**
- **Custom API endpoints**

### 🎯 Smart URL Matching
- **Host-based matching**: Activate toolbars on specific domains
- **Path-based matching**: Fine-grained control with URI patterns
- **Wildcard support**: Flexible matching with `*` patterns
- **Regular expressions**: Advanced pattern matching for power users
- **Rule priority system**: Control which rules take precedence
- **Real-time matching**: Automatic toolbar activation based on current URL

### 🛠️ Configurable Toolbars
- **Custom buttons**: Create personalized toolbar actions
- **Prompt templates**: Support for `{{selectedText}}` variables
- **Categorized organization**: Group buttons by function
- **Preset templates**: Quick-start with common text operations
- **Import/Export**: Share configurations with your team

### 📊 Rich Results Display
- **Streaming responses**: Real-time AI output
- **Markdown rendering**: Formatted text display
- **Code highlighting**: Syntax highlighting for code blocks
- **Copy functionality**: Quick result copying
- **Regeneration options**: Retry with different parameters
- **Resizable panels**: Adjust display to your preference

## 🚀 Installation

### Chrome/Edge
1. Download the latest release from the [Releases page](https://github.com/quzhaojing/agent-bar/releases)
2. Extract the downloaded archive
3. Open `chrome://extensions/` in your browser
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted folder

### Firefox
1. Download the Firefox build from the [Releases page](https://github.com/quzhaojing/agent-bar/releases)
2. Open `about:debugging` in Firefox
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the extracted extension folder

## 📖 Usage

### Quick Start
1. **Install the extension** in your browser
2. **Configure an LLM provider** in the settings
3. **Set up URL rules** to define where toolbars should appear
4. **Create toolbar buttons** with your preferred AI prompts
5. **Select text** on any matching webpage to see the toolbar
6. **Click a button** to process the selected text with AI

### Configuration Example

#### URL Matching Rules
```json
[
  {
    "pattern": "*.github.com",
    "enabled": true
  },
  {
    "pattern": "*.docs.google.com",
    "enabled": true
  }
]
```

#### Toolbar Button Configuration
```json
{
  "enabled": true,
  "id": "btn-1",
  "title": "Explain Code",
  "prompt": "Explain this code in detail:\n\n{{selectedText}}",
}
```

## 🛠️ Development

Built with the [Plasmo Framework](https://plasmo.com/) for modern browser extension development.

### Tech Stack
- **Framework**: Plasmo + React + TypeScript
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: Zustand
- **Storage**: Plasmo Storage (Chrome Extension Storage API)
- **Build System**: Vite (via Plasmo)

### Prerequisites
- Node.js 18+
- pnpm 9+

### Development Setup
```bash
# Clone the repository
git clone https://github.com/quzhaojing/agent-bar.git
cd agent-bar

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Build for specific browsers
pnpm build:chrome    # Chrome/Edge
pnpm build:firefox   # Firefox
```


## 🎯 Roadmap & Milestones

### Milestone 1: Core Foundation ✅
- [x] Basic Plasmo project setup
- [x] LLM provider configuration
- [x] Simple toolbar functionality
- [x] Basic content script injection
- [x] Chrome Extension support

### Milestone 2: Enhanced Features 🚧
- [ ] Dynamic option components
- [ ] Advanced browser automation
- [ ] Convert chatbox message to toolbar such as grok、gemini、claude.
- [ ] Convert chatbox message to toolbar


### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Plasmo Framework](https://plasmo.com/) for making browser extension development enjoyable
- The open-source AI community for inspiration and tools
- All contributors who help make this project better

## 📞 Support

- 📧 Email: [support@agentbar.dev](mailto:charellkingqu@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/quzhaojing/agent-bar/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/quzhaojing/agent-bar/discussions)
- 📖 Documentation: [Wiki](https://github.com/quzhaojing/agent-bar/wiki)

## 🔗 Links

- [Homepage](https://github.com/quzhaojing/agent-bar)
- [Chrome Web Store](https://chrome.google.com/webstore/) (coming soon)
- [Documentation](https://github.com/quzhaojing/agent-bar/wiki)
- [Change Log](CHANGELOG.md)
---

**Agent Bar** - Empower your text with AI, everywhere you browse. 🚀