import {KeycloakContext, CONTEXT_KEY, applyDirectiveTransformers} from '../src';
import {SchemaBase} from './utils/schemaBase';
import {buildSchema, graphql} from 'graphql';

jest.mock('../src/KeycloakContext');

const MockKeycloakContext = jest.mocked(new KeycloakContext({req: {} as any}));

const PermissionSchema = `#graphql
${SchemaBase}
extend type Query {
    requiresPermission: Boolean @hasPermission(resources: "article")
}
`;

beforeEach(() => {
    MockKeycloakContext.isAuthenticated.mockReset();
    MockKeycloakContext.hasPermission.mockReset();
});

test('context.auth.hasPermission() is called and protected resolver is called when authorised', async () => {
    const schema = applyDirectiveTransformers(buildSchema(PermissionSchema));

    const root = {
        requiresPermission: jest.fn()
    };

    MockKeycloakContext.isAuthenticated.mockReturnValue(true);
    MockKeycloakContext.hasPermission.mockResolvedValue(true);

    const {errors} = await graphql({
        schema,
        source: `#graphql
        query RequiresPermission {requiresPermission}
        `,
        rootValue: root,
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });

    expect(errors).toBeUndefined();
    expect(root.requiresPermission).toHaveBeenCalled();
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(MockKeycloakContext.hasPermission).toHaveBeenCalledWith(['article']);
});

test('hasPermission works on fields that have no resolvers. context.auth.hasPermission() is called', async () => {
    const schema = applyDirectiveTransformers(buildSchema(PermissionSchema));

    MockKeycloakContext.isAuthenticated.mockReturnValue(true);
    MockKeycloakContext.hasPermission.mockResolvedValue(true);

    const {errors} = await graphql({
        schema,
        source: `#graphql
        query RequiresPermission {requiresPermission}
        `,
        rootValue: {},
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });

    expect(errors).toBeUndefined();
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(MockKeycloakContext.hasPermission).toHaveBeenCalledWith(['article']);
});

test('hasPermission accepts an array of permissions', async () => {
    const sdl = `#graphql
    ${PermissionSchema}
    extend type Query {
        multiplePermissions: Boolean @hasPermission(resources: ["article:view","article:edit","article:delete"])
    }
    `;

    const schema = applyDirectiveTransformers(buildSchema(sdl));

    MockKeycloakContext.isAuthenticated.mockReturnValue(true);
    MockKeycloakContext.hasPermission.mockImplementation(async (resources: string|string[]) => {
        return resources.includes('article:delete');
    });

    const root = {
        multiplePermissions: jest.fn()
    };

    const {errors} = await graphql({
        schema,
        source: `#graphql
        query MultiplePermissions {multiplePermissions}
        `,
        rootValue: root,
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });

    expect(errors).toBeUndefined();
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(MockKeycloakContext.hasPermission).toHaveBeenCalledTimes(1);
    expect(MockKeycloakContext.hasPermission).toHaveBeenCalledWith(['article:view', 'article:edit', 'article:delete']);
    expect(root.multiplePermissions).toHaveBeenCalled();
});

test('if there is no authentication an error is returned and the original resolver will not execute', async () => {
    const schema = applyDirectiveTransformers(buildSchema(PermissionSchema));
    const {errors} = await graphql({
        schema,
        source: `#graphql
        query RequiresPermission {requiresPermission}
        `,
        rootValue: {},
        contextValue: {}
    });
    expect(errors?.[0]?.message).toMatch(/user not authenticated/i);
});

test('if token does not have the required permission, then an error is returned and the original resolver will not execute', async () => {
    const schema = applyDirectiveTransformers(buildSchema(PermissionSchema));

    const root = {
        requiresPermission: jest.fn()
    };

    MockKeycloakContext.isAuthenticated.mockReturnValue(true);
    MockKeycloakContext.hasPermission.mockResolvedValue(false);

    const {errors} = await graphql({
        schema,
        source: `#graphql
        query RequiresPermission {requiresPermission}
        `,
        rootValue: root,
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });

    expect(errors?.[0].message).toMatch(/user is not authorized. must have the following permissions: \[article]/i);
    expect(root.requiresPermission).not.toHaveBeenCalled();
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(MockKeycloakContext.hasPermission).toHaveBeenCalledWith(['article']);
});
