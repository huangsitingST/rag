import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../auth/auth.types.js'
import {
	buildDocumentFilter,
	buildPermissionFilter,
	escapeFilterValue
} from './filter.js'

const employee: AuthUser = {
	token: 'token',
	id: 'user-1',
	username: 'employee',
	name: '测试用户',
	tenantId: 'bluewhale',
	tenantName: '蓝鲸科技',
	departmentId: 'finance',
	departmentName: '财务部',
	role: 'employee',
	roleCode: 'service_staff'
}

describe('Milvus permission filter', () => {
	it('把租户、启用状态和部门权限放进检索条件', () => {
		expect(buildPermissionFilter(employee)).toBe(
			'tenant_id == "bluewhale" and is_active == true and (visibility == "company" or department_id == "finance")'
		)
	})

	it('管理员仍然必须受租户边界约束', () => {
		expect(buildPermissionFilter({ ...employee, role: 'admin' })).toBe(
			'tenant_id == "bluewhale" and is_active == true'
		)
	})

	it('查询文档历史时可以包含非启用版本', () => {
		expect(buildDocumentFilter('bluewhale', 'doc-1')).toBe(
			'tenant_id == "bluewhale" and document_id == "doc-1"'
		)
	})

	it('转义用户值，避免破坏 filter 表达式', () => {
		expect(escapeFilterValue('a"b\\c')).toBe('a\\"b\\\\c')
	})
})
