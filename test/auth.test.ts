import {applyDirectiveTransformers, CONTEXT_KEY, KeycloakContext} from '../src';
import {buildSchema, graphql} from 'graphql';
import {SchemaBase} from './utils/schemaBase';

jest.mock('../src/KeycloakContext');

const AuthSchema = `#graphql
${SchemaBase}
extend type Query {
    protected: Boolean @auth
}
`;

const MockKeycloakContext = jest.mocked(new KeycloakContext({req: {} as any}));

beforeEach(() => {
    MockKeycloakContext.isAuthenticated.mockReset();
});

test('context.kauth.isAuthenticated() is called, then original resolver is called', async () => {
    const schema = applyDirectiveTransformers(buildSchema(AuthSchema));
    MockKeycloakContext.isAuthenticated.mockReturnValue(true);

    const root = {
        protected: jest.fn()
    };

    await graphql({
        schema,
        source: `#graphql
        query Protected {protected}
        `,
        rootValue: root,
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });

    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(root.protected).toHaveBeenCalled();
});

test('context.kauth.isAuthenticated() is called, even if field has no resolver', async () => {
    const schema = applyDirectiveTransformers(buildSchema(AuthSchema));
    MockKeycloakContext.isAuthenticated.mockReturnValue(true);

    await graphql({
        schema,
        source: `#graphql
        query Protected {protected}
        `,
        rootValue: {},
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
});

test('caller will not be authenticated if context.kauth is not present', async () => {
    const schema = applyDirectiveTransformers(buildSchema(AuthSchema));
    const {errors} = await graphql({
        schema,
        source: `#graphql
        query Protected {protected}
        `,
        rootValue: {},
        contextValue: {}
    });
    expect(errors?.[0]?.message).toMatch(/user not authenticated/i);
});

test('call will fail if context.kauth.isAuthenticated returns false', async () => {
    const schema = applyDirectiveTransformers(buildSchema(AuthSchema));
    MockKeycloakContext.isAuthenticated.mockReturnValue(false);

    const {errors} = await graphql({
        schema,
        source: `#graphql
        query Protected {protected}
        `,
        rootValue: {},
        contextValue: {
            [CONTEXT_KEY]: MockKeycloakContext
        }
    });
    expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
    expect(errors?.[0]?.message).toMatch(/user not authenticated/i);
});
