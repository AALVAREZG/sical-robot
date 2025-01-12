# Sical Robot - Bank Movement Manager

> ⚠️ **Development Status**: This project is currently under active development and is not yet ready for production use. Features may be incomplete or subject to change.

![Development Status](https://img.shields.io/badge/Status-Under%20Development-yellow)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![Electron](https://img.shields.io/badge/Electron-33.0.0-blue)

An Electron application for managing bank movements and generating accounting entries.

## Development Status

- [ ] Core Features
  - [x] Database Integration
  - [x] Bank Movement Import
  - [ ] Accounting Entry Generation
  - [ ] Error Handling
  - [ ] Language Support.
- [ ] User Interface
  - [x] Main Layout
  - [x] Transaction List
  - [ ] Settings Panel
  - [ ] Advanced Filters
- [ ] Testing
  - [ ] Unit Tests
  - [ ] Integration Tests
  - [ ] End-to-End Tests
- [ ] Documentation
  - [x] Basic README
  - [ ] API Documentation
  - [ ] User Guide

## Features

- Import bank movements from multiple file formats (XLSX, CSV)
- Track movements across different bank accounts
- Mark transactions as accounted
- Generate accounting entries
- Preview and validate imported data
- Search and filter functionality
- Status tracking system

## Prerequisites

- Node.js >= 20.0.0
- npm or yarn package manager
- Electron 33.0.0

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sical-robot.git

# Navigate to project directory
cd sical-robot

# Install dependencies
npm install
```

## Usage

```bash
# Start the application
npm start

# Build the application
npm run dist
```

## Development

The application uses:
- Electron for cross-platform desktop app
- SQLite3 for local data storage
- XLSX for Excel file processing
- Custom UI components

## Building

To build for production:

```bash
# For your current platform
npm run dist

# For all platforms
npm run dist:all
```

## Screenshots

### Main Interface
![Main Interface](/screenshots/main-interface.png)
- Dark theme interface
- Left sidebar for bank account selection
- Main content area showing transactions
- Status bar with real-time information

### Transaction Management
![Transaction List](/screenshots/transaction-list.png)
- Color-coded transactions (green for positive, red for negative)
- Status indicators for accounted entries
- Quick action buttons for each transaction
- Search and filter capabilities

### Import Preview
![Import Preview](/screenshots/import-preview.png)
- Preview imported data before committing
- Validation checks
- Duplicate detection
- Batch import controls

### Accounting Entry Dialog (not implemented)
![Accounting Dialog](/screenshots/accounting-dialog.png)
- Form for creating accounting entries
- Multiple application entries support
- Real-time total calculation
- Validation and error checking

## Development Credits

This project was developed with assistance from:
- Claude 3.5 Sonnet (Anthropic) - AI model that helped with:
  - Code generation and optimization
  - Documentation writing
  - Best practices implementation
  - Project structure recommendations

Integrated by human developer.

## License

[MIT](https://choosealicense.com/licenses/mit/)

