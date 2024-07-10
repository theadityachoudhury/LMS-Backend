export interface User {
    id: string; // Corresponds to the `id` field in the Prisma model
    email: string; // Corresponds to the `email` field in the Prisma model
    username: string; // Corresponds to the `username` field in the Prisma model
    password: string; // Corresponds to the `password` field in the Prisma model
    name: {
        first: string; // Corresponds to the `first` field in the `name` field in the Prisma model
        last: string | null; // Corresponds to the `last` field in the `name` field in the Prisma model
    }; // Corresponds to the optional `name` field in the Prisma model
    role: 'USER' | 'ADMIN'; // Corresponds to the `role` field in the Prisma model
    verified: boolean; // Corresponds to the `verified` field in the Prisma model
    deleted: boolean; // Corresponds to the `deleted` field in the Prisma model
    disabled: boolean; // Corresponds to the `disabled` field in the Prisma model
    createdAt: Date; // Corresponds to the `createdAt` field in the Prisma model
    updatedAt: Date; // Corresponds to the `updatedAt` field in the Prisma model
}

export interface resUser {
    id: string; // Corresponds to the `id` field in the Prisma model
    email: string; // Corresponds to the `email` field in the Prisma model
    username: string; // Corresponds to the `username` field in the Prisma model
    name: {
        first: string; // Corresponds to the `first` field in the `name` field in the Prisma model
        last: string | null; // Corresponds to the `last` field in the `name` field in the Prisma model
    }; // Corresponds to the optional `name` field in the Prisma model
    role: 'USER' | 'ADMIN'; // Corresponds to the `role` field in the Prisma model
    createdAt: Date; // Corresponds to the `createdAt` field in the Prisma model
    updatedAt: Date; // Corresponds to the `updatedAt` field in the Prisma model
    deleted: boolean; // Corresponds to the `deleted` field in the Prisma model
    disabled: boolean; // Corresponds to the `disabled` field in the Prisma model
    verified: boolean; // Corresponds to the `verified` field in the Prisma model
}