# Todo App with Customizable Swim Lanes

A modern todo application built with Next.js featuring customizable swim lanes, drag-and-drop functionality, folders, and advanced task management with tags and due dates.

## Features

- **Customizable Swim Lanes**: Create, rename, reorder, and delete swim lanes
- **Drag & Drop**: Reorder swim lanes with intuitive drag-and-drop
- **Folder Organization**: Organize tasks within folders inside swim lanes
- **Advanced Task Management**:
  - Create, edit, and delete tasks
  - Add descriptions and due dates
  - Custom tags with colors
  - Mark tasks as complete/incomplete
- **Modern UI**: Built with Radix UI for a clean, accessible interface

## Tech Stack

- **Frontend**: Next.js 15, React 19
- **UI Components**: Radix UI Themes
- **Drag & Drop**: DnD Kit
- **Database**: PostgreSQL with Prisma ORM
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL database

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database
2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your database connection string:
   ```
   DATABASE_PUBLIC_URL="postgresql://username:password@localhost:5432/summer_app_db"
   ```

### 3. Initialize Database

Generate and run the database migration:

```bash
# Generate Prisma client
npx prisma generate

# Run the migration to create tables
npx prisma db push

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. **Create Swim Lanes**: Click "Add Swim Lane" to create your first lane
2. **Customize Names**: Click the edit icon to rename swim lanes
3. **Reorder**: Drag swim lanes by the grip handle to reorder them
4. **Add Folders**: Click "Add Folder" within a swim lane to organize tasks
5. **Manage Tasks**:
   - Click "Add Task" within a folder
   - Click on any task to edit details, add tags, or set due dates
   - Check tasks off as you complete them

## Database Schema

The app uses a hierarchical structure:
- **Swim Lanes** contain multiple **Folders**
- **Folders** contain multiple **Tasks**
- **Tasks** can have multiple **Tags** (many-to-many relationship)

## Development

- **Build**: `npm run build`
- **Database Reset**: `npx prisma db push --force-reset` (⚠️ This will delete all data)
- **View Database**: `npx prisma studio`
