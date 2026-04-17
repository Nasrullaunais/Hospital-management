# Feature: Departments

**Module:** Departments & Wards

---

## Overview

Manage hospital departments including department details, head doctors, locations, and contact information.

---

## Files

| File | Purpose |
|------|---------|
| `services/department.service.ts` | API service for department operations |
| `screens/DepartmentListScreen.tsx` | List view of all departments |
| `screens/DepartmentDetailScreen.tsx` | Department detail view |

---

## Services

### departmentService

```typescript
getDepartments(filters?: { status?: 'active' | 'inactive' }): Promise<Department[]>
getDepartmentById(id: string): Promise<Department>
createDepartment(payload: CreateDepartmentPayload): Promise<Department>
updateDepartment(id: string, payload: UpdateDepartmentPayload): Promise<Department>
deleteDepartment(id: string): Promise<void>
```

---

## Usage

```typescript
import { departmentService } from '../services/department.service';

// List all departments
const departments = await departmentService.getDepartments();

// Get single department
const department = await departmentService.getDepartmentById(id);

// Create department (Admin)
const newDept = await departmentService.createDepartment({
  name: 'Cardiology',
  description: 'Heart and cardiovascular care',
  location: 'Building A, Floor 3',
  phone: '+1-555-0100',
});

// Update department (Admin)
await departmentService.updateDepartment(id, { status: 'inactive' });

// Delete department (Admin)
await departmentService.deleteDepartment(id);
```

---

## Screens

### DepartmentListScreen

- Displays all departments in a scrollable list
- Search functionality by department name
- Pull-to-refresh support
- Admin: Shows "Add Department" button

### DepartmentDetailScreen

- Shows full department information
- Admin: Edit and Delete action buttons
