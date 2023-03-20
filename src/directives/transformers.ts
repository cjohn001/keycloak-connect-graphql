import {defaultFieldResolver, GraphQLSchema} from 'graphql';
import {auth, hasPermission, hasRole} from './directiveResolvers';
import {getDirective, MapperKind, mapSchema} from '@graphql-tools/utils';

export type HasRoleResolver = (roles: string | string[]) => (next: Function) => (...params: any[]) => any;

export const authDirectiveTransformer = (schema: GraphQLSchema, directiveName: string = 'auth') => {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
            if (authDirective) {
                const { resolve = defaultFieldResolver } = fieldConfig;
                fieldConfig.resolve = auth(resolve);
            }
            return fieldConfig;
        }
    });
};

export const roleDirectiveTransformer = (schema: GraphQLSchema, directiveName: string = 'hasRole', resolver: HasRoleResolver = hasRole) => {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const roleDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
            if (roleDirective) {
                const {resolve = defaultFieldResolver} = fieldConfig;
                const keys = Object.keys(roleDirective);
                let role: string | string[];
                if (keys.length === 1 && keys[0] === 'role') {
                    role = roleDirective[keys[0]];
                    if (typeof role === 'string') {
                        role = [role];
                    }
                    if (Array.isArray(role)) {
                        role = role.map((val: any) => String(val));
                    } else {
                        throw new Error('invalid hasRole args. role must be a String or an Array of Strings');
                    }
                } else {
                    throw Error('invalid hasRole args. must contain only a "role" argument');
                }
                fieldConfig.resolve = resolver(role)(resolve);
            }
            return fieldConfig;
        }
    });
};

export const permissionDirectiveTransformer = (schema: GraphQLSchema, directiveName: string = 'hasPermission') => {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const permissionDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
            if (permissionDirective) {
                const { resolve = defaultFieldResolver } = fieldConfig;
                const keys = Object.keys(permissionDirective);
                let resources;
                if (keys.length === 1 && keys[0] === 'resources') {
                    resources = permissionDirective[keys[0]];
                    if (typeof resources === 'string') {
                        resources = [resources];
                    }
                    if (Array.isArray(resources)) {
                        resources = resources.map((val: any) => String(val));
                    } else {
                        throw new Error('invalid hasPermission args - resources must be a string or an array of string');
                    }
                } else {
                    throw Error('invalid hasPermission args. Must contain only a "resources" argument');
                }
                fieldConfig.resolve = hasPermission(resources)(resolve);
            }
            return fieldConfig;
        }
    });
};
