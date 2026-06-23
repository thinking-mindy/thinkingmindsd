export type StudentStatus = "active" | "graduated" | "withdrawn";

export type EducationLevel = "primary" | "high_school" | "tertiary";

export interface SchoolSettings {
  _id?: string;
  orgId: string;
  enabledLevels: EducationLevel[];
  defaultLevel: EducationLevel;
  institutionName?: string;
  updatedAt: string;
}

export interface SchoolClass {
  _id?: string;
  orgId: string;
  educationLevel: EducationLevel;
  name: string;
  gradeLevel?: string;
  room?: string;
  teacherName?: string;
  capacity?: number;
  /** Faculty or department — mainly tertiary */
  faculty?: string;
  /** Programme code or stream */
  program?: string;
  /** Total term fee owed by students in this class */
  feesPerTerm?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolStudent {
  _id?: string;
  orgId: string;
  educationLevel?: EducationLevel;
  studentNumber: string;
  firstName: string;
  lastName: string;
  classId?: string;
  className?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "";
  status: StudentStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SchoolStudentInput = Omit<SchoolStudent, "_id" | "orgId" | "studentNumber" | "createdAt" | "updatedAt"> & {
  studentNumber?: string;
};

export type SchoolClassInput = Omit<SchoolClass, "_id" | "orgId" | "createdAt" | "updatedAt">;

export type SchoolSettingsInput = Pick<SchoolSettings, "enabledLevels" | "defaultLevel" | "institutionName">;
