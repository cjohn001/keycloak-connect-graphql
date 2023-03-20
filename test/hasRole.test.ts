import {graphql, buildSchema} from 'graphql';
import {
  applyDirectiveTransformers,
  CONTEXT_KEY,
  KeycloakContext
} from '../src';
import {SchemaBase} from './utils/schemaBase';

jest.mock('../src/KeycloakContext');

const RoleSchema = `#graphql
${SchemaBase}
extend type Query {
  hello(what: String="world"): String
  needsRole: Boolean @hasRole(role: "admin")
}
`;

const MockKeycloakContext = jest.mocked(new KeycloakContext({req: {} as any}));

beforeEach(() => {
  MockKeycloakContext.hasRole.mockReset();
  MockKeycloakContext.isAuthenticated.mockReset();
});

test('hello should be callable without an access token', async () => {
  const schema = applyDirectiveTransformers(buildSchema(RoleSchema));

  const root = {
    'hello': ({what}: {what: string}, _ctx: any) => {
      return what;
    }
  };

  const {data} = await graphql({
    schema,
    source: `#graphql
    query Hello {hello(what: "mum")}
    `,
    rootValue: root,
    contextValue: {
      [CONTEXT_KEY]: MockKeycloakContext
    }
  });

  //
  // We expect the query to return what we passed it as an arg and that
  // isAuthenticated() on the KeycloakContext object was not called because
  // the hello field is not protected with a directive.
  //
  expect(data?.hello).toEqual('mum');
  expect(MockKeycloakContext.isAuthenticated).not.toHaveBeenCalled();
});

test('context.kauth.hasRole() is called and returns false', async () => {
  const sdl = `#graphql
  ${RoleSchema}
  extend type Query {
    noAccess: Boolean @hasRole(role: "admin")
  }
  `;

  const schema = applyDirectiveTransformers(buildSchema(sdl));
  MockKeycloakContext.isAuthenticated.mockReturnValue(true);
  MockKeycloakContext.hasRole.mockImplementation((role: string) => {
    expect(role).toEqual('admin');
    return false;
  });

  const root = {
    noAccess: jest.fn()
  };

  const {errors} = await graphql({
    schema,
    source: `#graphql
    query NoAccess {noAccess}
    `,
    rootValue: root,
    contextValue: {
      [CONTEXT_KEY]: MockKeycloakContext
    }
  });

  //
  // We expect the graphql call to result in an error telling us the caller does not have
  // the required admin role. A call should have been made to our mock keycloak context
  // to determine if the caller has the required role. Additionally, the resolver for
  // Query.noAccess should not have been called.
  //
  expect(errors?.[0]?.message).toMatch(/User is not authorized. Must have one of the following roles: \[admin]/i);
  expect(MockKeycloakContext.hasRole).toHaveBeenCalled();
  expect(root.noAccess).not.toHaveBeenCalled();
});

test('context.kauth.hasRole() is called and returns true', async () => {
  const sdl = `#graphql
  ${RoleSchema}
  extend type Query {
    isAllowed: Boolean @hasRole(role: "admin")
  }
  `;

  const schema = applyDirectiveTransformers(buildSchema(sdl));
  MockKeycloakContext.isAuthenticated.mockReturnValue(true);
  MockKeycloakContext.hasRole.mockImplementation((role: string) => {
    expect(role).toEqual('admin');
    return true;
  });

  const root = {
    isAllowed: jest.fn()
  };

  const {errors, data} = await graphql({
    schema,
    source: `#graphql
    query IsAllowed {isAllowed}
    `,
    rootValue: root,
    contextValue: {
      [CONTEXT_KEY]: MockKeycloakContext
    }
  });

  //
  // We expect the graphql call to be successful with no errors. A call should have been made
  // to our mock keycloak context to determine if the caller is authenticated and has the required
  // role. Additionally, the resolver for Query.isAllowed should not have been called.
  //
  expect(errors).toBeUndefined();
  expect(data).toBeDefined();
  expect(MockKeycloakContext.hasRole).toHaveBeenCalled();
  expect(root.isAllowed).toHaveBeenCalled();
});

test('hasRole works on fields that have no resolvers. context.auth.hasRole() is called', async () => {
  const sdl = `#graphql
  ${RoleSchema}
  extend type Query {
    noResolver: Boolean @hasRole(role: "staff")
  }
  `;

  const schema = applyDirectiveTransformers(buildSchema(sdl));
  MockKeycloakContext.isAuthenticated.mockReturnValue(true);
  MockKeycloakContext.hasRole.mockImplementation((role: string) => {
    expect(role).toMatch('staff');
    return true;
  });

  const {errors, data} = await graphql({
    schema,
    source: `#graphql
    query NoResolver {noResolver}
    `,
    rootValue: {},
    contextValue: {
      [CONTEXT_KEY]: MockKeycloakContext
    }
  });

  expect(errors).toBeUndefined();
  expect(data).toBeDefined();
  expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
  expect(MockKeycloakContext.hasRole).toHaveBeenCalledWith('staff');
});

test('hasRole directive accepts an array of roles', async () => {
  const sdl = `#graphql
  ${RoleSchema}
  extend type Query {
    multipleRoles: Boolean @hasRole(role: ["staff", "admin", "observer"])
  }
  `;

  const schema = applyDirectiveTransformers(buildSchema(sdl));
  MockKeycloakContext.isAuthenticated.mockReturnValue(true);
  MockKeycloakContext.hasRole.mockImplementation((role: string) => {
    return role === 'observer';
  });

  const {errors, data} = await graphql({
    schema,
    source: `#graphql
    query MultipleRoles {multipleRoles}
    `,
    rootValue: {},
    contextValue: {
      [CONTEXT_KEY]: MockKeycloakContext
    }
  });

  expect(errors).toBeUndefined();
  expect(data).toBeDefined();
  expect(MockKeycloakContext.isAuthenticated).toHaveBeenCalled();
  expect(MockKeycloakContext.hasRole).toHaveBeenCalledTimes(3);
  expect(MockKeycloakContext.hasRole).toHaveBeenCalledWith('staff');
  expect(MockKeycloakContext.hasRole).toHaveBeenCalledWith('admin');
  expect(MockKeycloakContext.hasRole).toHaveBeenCalledWith('observer');
});

test('caller will not be authenticated if context.kauth is not present', async () => {
  const schema = applyDirectiveTransformers(buildSchema(RoleSchema));
  const {errors} = await graphql({
    schema,
    source: `#graphql
    query NeedsRole {needsRole}
    `,
    rootValue: {},
    contextValue: {}
  });
  expect(errors?.[0]?.message).toMatch(/user not authenticated/i);
});
