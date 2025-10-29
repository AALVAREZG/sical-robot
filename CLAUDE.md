# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sical Robot** is an Electron desktop application for managing bank movements and generating accounting entries. It imports bank transactions from multiple banks, applies pattern-based translation to create accounting entries, and integrates with an external Python service for sending data to RabbitMQ.

**Tech Stack**: Electron 33.0.0, SQLite3, Node.js >=20.0.0, vanilla JavaScript (no frontend framework)

## Development Commands

```bash
# Start the application in development mode
npm start

# Build for production (creates distributable EXE)
npm run dist

# Quick build preview (no installer)
npm run pack
```

## Architecture Overview

### Electron Process Architecture

1. **Main Process** ([src/main.js](src/main.js)) - 1140+ lines
   - Initializes Electron app with 1920x1080 window (min 800x600)
   - Manages SQLite databases (main + treasury)
   - Handles file I/O operations
   - Contains 100+ IPC handlers for renderer communication
   - Integrates with external Python service (senderToRabbitMQ.exe)

2. **Renderer Process** ([src/renderer.js](src/renderer.js)) - 1260+ lines
   - UI logic and event handlers
   - No direct Node.js access (context isolation enabled)
   - Communicates via IPC bridge

3. **Preload Bridge** ([src/preload.js](src/preload.js))
   - Secure context isolation between main and renderer
   - Exposes safe IPC methods via `window.api`

### Database Architecture

**Main Database** (`src/data/db/prueba05.sqlite`):
- `movimientos_bancarios` - Bank transactions with sort_key index
- `accounting_entries` - Accounting records with indexes on account_code, date, amount
- `accounting_tasks` - Task queue for external service integration
- `bank_accounting_mapping` - Links bank movements to accounting entries

**Treasury Database** (`src/data/db/treasuryForecast.sqlite`):
- `treasury_config`, `treasury_periods` - Configuration and periods (metro metaphor)
- `income_categories`, `expense_categories` - Category definitions
- `income_forecasts`, `expense_forecasts` - Forecast data
- `financial_reserves` - Reserve tracking

Database initialization happens in [src/database.js](src/database.js) and [src/treasuryForecastDatabase.js](src/treasuryForecastDatabase.js).

### Service Layer

- **[services/fileImport.js](services/fileImport.js)** - Multi-bank XLSX/CSV import with duplicate prevention via SHA256 hashing
- **[services/accountingImport.js](services/accountingImport.js)** - Accounting record import
- **[services/listBasedAccountingImport.js](services/listBasedAccountingImport.js)** - List-based accounting import

### Pattern-Based Translation System

**Core Concept**: Bank transactions are matched against configurable patterns to generate accounting entries.

**Implementation** ([src/bank-translator.js](src/bank-translator.js)):
- Patterns stored in `src/data/transaction-patterns.json`
- Each pattern has a `matcher` function (returns boolean) and `generator` function (returns accounting entry object)
- Fallback generation for unmapped transactions
- Pattern Manager UI for dynamic pattern creation/testing
- References third-party data from `src/data/records/terceros.csv`

## Key Bank Account Identifiers

```javascript
CAJARURAL = '203_CRURAL - 0727'
CAJARURAL_SECONDARY = '239_CRURAL_MUR_8923'
CAIXABANK = '200_CAIXABNK - 2064'
CAIXABANK_SECONDARY = '204_CAIXABNK_REC_3616'
```

## Bank Import System

**Supported Banks**: Caja Rural, CaixaBank, BBVA, Santander, Unicaja

**File Detection Logic**:
- Bank type detected from filename prefix and extension
- CRURAL: `*.XLSX` starting with "CRURAL"
- CAIXABANK: `*.XLS` starting with "CAIXABANK"
- BBVA: `*.XLSX` starting with "BBVA"
- SANTANDER: `*.XLSX` starting with "SANTANDER"
- UNICAJA: `*.XLS` starting with "UNICAJA"

**Import Flow**:
1. User selects file via dialog
2. System detects bank type from filename
3. Bank-specific column mapping applied
4. Duplicate check via hash: `SHA256(caja + fecha + concepto + importe + saldo)`
5. Preview dialog shows records to be imported
6. User confirms import
7. Records inserted with `sort_key` for chronological ordering

## External Service Integration

**Python Service**: `src/data/sender/senderToRabbitMQ.exe`
- Spawned via `child_process.spawn()` from Node.js
- Sends accounting data to RabbitMQ/external systems
- Task queue: JSON files in `src/data/sender/input/pending_files/`
- 60-second timeout per execution

## UI Components

**Main Interface** ([src/index.html](src/index.html)):
- Header with title + user section
- Sidebar with dynamic bank account cards
- Tabbed content area (Movimientos, Treasury Forecast, Reports)
- Status bar with real-time info

**Key Components**:
- `/components/taskForm/` - Task creation forms
- `/components/taskList/` - Task list display
- `/components/taskManager/` - Task management
- `/contabilizarDialog/` - Accounting entry modal with ADO/ARQUEO editors

**Styling**: Dark theme with blue (#4C9AFF) primary color, Roboto Mono/Condensed fonts

## Treasury Forecasting

**Metro Line Metaphor**: Periods visualized as metro stations

**Features**:
- Dynamic income/expense categories with icons
- Net flow calculations per period
- Balance projections
- Financial insights and analytics
- Data import/export

**Key Functions** (in [src/renderer.js](src/renderer.js)):
- `renderMetroLine()` - Renders metro station visualization
- `updateTreasuryDisplay()` - Updates forecast display
- Income/expense category management

## Search and Filtering

**Implementation Details**:
- Multi-field full-text search across all transaction fields
- Tab-based filtering: All/Contabilized/Not-Contabilized
- Column-specific filtering dropdown
- Pagination: 25 records per page (default)
- Sortable columns via clickable headers
- Search debouncing: 300ms delay

## Important IPC Handlers

Major IPC categories (100+ total handlers):
- **Bank Movements**: `get-cajas`, `get-last-100-records`, `select-file`, `process-file`, `import-records`
- **Accounting**: `open-contabilizar-dialog`, `save-accounting-tasks`, `get-accounting-tasks`
- **Patterns**: `get-patterns`, `save-patterns`, `test-pattern`, `reload-patterns`
- **Treasury**: `get-metro-treasury-data`, `update-treasury-forecast`, `get-financial-summary`
- **Balance**: `get-current-balance`, `validateBalances`

## Code Conventions

### Database Operations
- All database operations in main process via IPC
- Use parameterized queries to prevent SQL injection
- Transactions for multi-step operations
- Sort key format: `YYYYMMDD-HHMMSS-sortIndex` for chronological ordering

### File Operations
- Dialog-based file selection (prevents arbitrary file access)
- XLSX processing via `xlsx` library
- CSV processing via `csv-parser` and `papaparse` (streaming)
- Multer for file uploads

### Error Handling
- IPC handlers wrap operations in try-catch
- Errors returned to renderer with `success: false, error: message`
- User-facing errors shown via toast notifications

### Pattern Functions
- Matchers must return boolean
- Generators must return object with: `accountCode`, `description`, `amount`, `isCredit`, `entityCode`, `entityName`
- Test patterns before saving via Pattern Manager UI

## Development Status

**Active Development**: This project is under active development. Recent work focuses on Treasury Forecast features and compact visualizations.

**Known TODO Areas** (from README):
- Error handling improvements
- Language/internationalization support
- Settings panel
- Advanced filtering
- Unit, integration, and end-to-end tests
- API and user documentation

## File Locations Reference

```
src/
├── main.js                     # Electron main process
├── renderer.js                 # UI logic (1260+ lines)
├── preload.js                  # IPC bridge
├── index.html                  # Main UI
├── database.js                 # Main DB management
├── treasuryForecastDatabase.js # Treasury DB management
├── bank-translator.js          # Pattern matching system
├── BalanceConsistencyValidator.js # Balance validation
├── components/                 # Reusable UI components
├── services/                   # Business logic layer
├── contabilizarDialog/         # Accounting entry dialog
└── data/
    ├── db/
    │   ├── prueba05.sqlite           # Main database
    │   └── treasuryForecast.sqlite   # Treasury database
    ├── transaction-patterns.json     # Pattern definitions
    ├── records/terceros.csv          # Third-party reference
    └── sender/
        ├── senderToRabbitMQ.exe      # Python service
        └── input/pending_files/      # Task queue directory
```

## Performance Considerations

- Database indexes on frequently-queried fields (`sort_key`, `account_code`, `date`, `amount`)
- Pagination limits queries to 25 records per page
- Stream-based CSV parsing for large files
- Search debouncing to reduce database queries
- Lazy loading of account data

## Security Model

- Context isolation enabled (renderer cannot access Node.js directly)
- Node integration disabled in renderer
- Web security enabled
- Dialog-based file selection (no arbitrary file paths)
- Hash-based duplicate prevention
- Parameterized database queries
- Service separation (external logic in separate process)
