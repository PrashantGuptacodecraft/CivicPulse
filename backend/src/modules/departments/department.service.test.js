import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DepartmentService } from './department.service.js';
import { prisma } from '@civiq/db';
vi.mock('@civiq/db', () => ({
    prisma: {
        department: {
            create: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));
describe('DepartmentService', () => {
    const service = new DepartmentService();
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should create a department with issue categories', async () => {
        const mockDept = { id: 'dept-1', name: 'Roads', organizationId: 'org-1', issueCategories: ['pothole', 'streetlights'] };
        vi.mocked(prisma.department.create).mockResolvedValue(mockDept);
        const result = await service.createDepartment({
            name: 'Roads',
            organizationId: 'org-1',
            issueCategories: ['pothole', 'streetlights'],
        });
        expect(prisma.department.create).toHaveBeenCalledWith({
            data: { name: 'Roads', organizationId: 'org-1', issueCategories: ['pothole', 'streetlights'] },
        });
        expect(result).toEqual(mockDept);
    });
    it('should get department by id', async () => {
        const mockDept = { id: 'dept-1', name: 'Roads', organizationId: 'org-1' };
        vi.mocked(prisma.department.findFirst).mockResolvedValue(mockDept);
        const result = await service.getDepartmentById('dept-1');
        expect(prisma.department.findFirst).toHaveBeenCalledWith({
            where: { id: 'dept-1', deletedAt: null },
            include: { organization: { include: { jurisdiction: true } } },
        });
        expect(result).toEqual(mockDept);
    });
    it('should list departments by organization', async () => {
        const mockDepts = [{ id: 'dept-1', name: 'Roads', organizationId: 'org-1' }];
        vi.mocked(prisma.department.findMany).mockResolvedValue(mockDepts);
        const result = await service.listDepartmentsByOrganization('org-1');
        expect(prisma.department.findMany).toHaveBeenCalledWith({
            where: { organizationId: 'org-1', deletedAt: null },
        });
        expect(result).toEqual(mockDepts);
    });
});
