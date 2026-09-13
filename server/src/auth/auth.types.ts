export type UserRole = "teacher" | "service_staff";
export type UserRoleCode = "teacher" | "service_staff";

export interface AuthUser {
  token: string;
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleCode: UserRoleCode;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
