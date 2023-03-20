# @dbateman/keycloak-connect-graphql

![GitHub](https://img.shields.io/github/license/aerogear/keycloak-connect-graphql.svg)

## Updated For graphql ^16.0.0 and graphql-tools ^9.0.0 
This is a fork of the [original @Aerogear project](https://github.com/aerogear/keycloak-connect-graphql) (now sadly unmaintained) and has been updated to work with `Apollo Server 4` (other graphql servers are untested but there's a good chance they will work if built upon the same foundation), `graphql v16` and `graphql-tools v9`.

## Apollo Server 4 Example
It's easy to get up and running with the `@auth`, `@hasRole` and `@hasPermission` custom directives provided by this library. Here's an example instantiation of an Apollo Server 4 instance (but can also be adapted to Apollo Server 3 simply enough, but it has some differences around context creation etc):

```bash
npm i @dbateman/keycloak-connect-graphql
```

Install required dependencies:
```bash
npm i graphql keycloak-connect
```

Install Apollo Server (or your preference of graphql server based on express)
```bash
npm i @apollo/server 
```

Now you need to define your schema, resolvers and start your apollo server.

```typescript
import Keycloak from "keycloak-connect";
import {applyDirectiveTransformers, KeycloakContext} from "@dbateman/keycloak-connect-graphql";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {ApolloServerPluginDrainHttpServer} from "@apollo/server/plugin/drainHttpServer";
import {expressMiddleware} from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import http from "http";

const app = express();
const keycloak = new Keycloak({}, {/*...your keycloak connect config here...*/});
const httpServer = http.createServer(app);

// Type your context for use in your resolvers etc.
interface IRequestContext {
    // Must be called kauth as it is looked for by name in the
    // directive resolvers.
    kauth: KeycloakContext;
}

//
// Define your schema somewhere.
//
const schema = `#graphql
    type Query {
        doSomething: Boolean @hasRole(role: "staff")
    }
`;

//
// Define your resolvers.
//
const resolvers = {
    Query: {
        doSomething: async (_: unknown, __: unknown, context: IRequestContext) => {
            //
            // You can access the keycloak context in your resolvers
            // via context.kauth if you need more authorisation logic
            // than is offered by the @hasRole et al directives:
            //
            //   context.kauth.hasRole("roleName") etc
            //
            return true;
        }
    }
}

//
// Instantiate your apollo server 4 instance.
//
const apollo = new ApolloServer<IRequestContext>({
    schema: applyDirectiveTransformers(makeExecutableSchema({typeDefs: schema, resolvers})),
    plugins: [ApolloServerPluginDrainHttpServer({httpServer})]
});
await apollo.start();

//
// Configure your express app to use the apollo server to handle
// requests to /graphql (or wherever you prefer).
//
app.use(
    '/graphql',
    express.json(),
    keycloak.middleware(),
    expressMiddleware(
        apollo,
        {
            context: async ({req}: any) => {
                const context: IRequestContext = {
                    request: req,
                    kauth: new KeycloakContext({req})
                }

                // Do whatever else you need to here to set the context
                // for each request.
                
                return context;
            }
        }
    )
);

(async () => {
    await httpServer.listen(PORT, () => {});
});
```

---
## Original Description (With Incompatible Stuff Removed)
A comprehensive solution for adding [keycloak](https://www.keycloak.org/) authentication and authorisation to your Express based GraphQL server. 

Based on the [keycloak-connect](https://github.com/keycloak/keycloak-nodejs-connect) middleware for Express. Provides useful authentication/authorization features within your GraphQL application.

## Features

🔒  Auth at the **GraphQL layer**. Authentication and Role Based Access Control (RBAC) on individual Queries, Mutations and fields.

⚡️  Auth on Subscriptions. Authentication and RBAC on incoming websocket connections for subscriptions.

🔑  Access to token/user information in resolver context via `context.kauth` (for regular resolvers and subscriptions)

📝  Declarative `@auth`, `@hasRole` and `@hasPermission` directives that can be applied directly in your Schema.

⚙️  `auth`, `hasRole` and `hasPermission` middleware resolver functions that can be used directly in code. (Alternative to directives)

## Using @auth, @hasRole and @hasPermission directives (Apollo Server only)

In Apollo Server, the `@auth`, `@hasRole` and `@hasPermission` directives can be used directly on the schema.
This declarative approach means auth logic is never mixed with business logic.

```js
const Keycloak = require('keycloak-connect')
const { KeycloakContext, KeycloakTypeDefs, KeycloakSchemaDirectives } = require('keycloak-connect-graphql')

const typeDefs = gql`
  type Article {
    id: ID!
    title: String!
    content: String!
  }

  type Query {
    listArticles: [Article]! @auth
  }

  type Mutation {
    publishArticle(title: String!, content: String!): Article! @hasRole(role: "editor")
    unpublishArticle(title: String!):Boolean @hasPermission(resources: ["Article:publish","Article:delete"])
  }
`

const resolvers = {
  Query: {
    listArticles: (obj, args, context, info) => {
      return Database.listArticles()
    }
  },
  mutation: {
    publishArticle: (object, args, context, info) => {
      const user = context.kauth.accessToken.content // get the user details from the access token
      return Database.createArticle(args.title, args.content, user)
    },
	unpublishArticle: (object, args, context, info) => {
	  const user = context.kauth.accessToken.content
      return Database.deleteArticle(args.title, user)
    }
  }
}
```

In this example a number of things are happening:

1. `@auth` is applied to the `listArticles` Query. This means a user must be authenticated for this Query.
2. `@hasRole(role: "editor")` is applied to the `publishArticle` Mutation. This means the keycloak user must have the editor *client role* in keycloak
3. `@hasPermission(resources: ["Article:publish","Article:delete"])` is applied to `unpublishArticle` Mutation. This means keycloak user must have all permissions given in resources array.
4. The `publishArticle` resolver demonstrates how `context.kauth` can be used to get the keycloak user details

### `auth`,`hasRole` and `hasPermission` middlewares.

`keycloak-connect-graphql` also exports the `auth` ,`hasRole` and `hasPermission` logic directly. They can be thought of as middlewares that wrap your business logic resolvers. This is useful if you don't have a clear way to use schema directives (e.g. when using `graphql-express`).

```js
const { auth, hasRole } = require('keycloak-connect-graphql')

const resolvers = {
  Query: {
    listArticles: auth(listArticlesResolver)
  },
  mutation: {
    publishArticle: hasRole('editor')(publishArticleResolver),
    unpublishArticle: hasPermission(['Article:publish','Article:delete'])(unpublishArticleResolver)
  }
}
```

### hasRole Usage and Options

**`@hasRole` directive**

The syntax for the `@hasRole` schema directive is `@hasRole(role: "rolename")` or `@hasRole(role: ["array", "of", "roles"])`

**`hasRole`**

* The usage for the exported `hasRole` function is `hasRole('rolename')` or `hasRole(['array', 'of', 'roles'])`

Both the `@hasRole` schema directive and the exported `hasRole` function work exactly the same.

* If a single string is provided, it returns true if the keycloak user has a **client role** with that name.
* If an array of strings is provided, it returns true if the keycloak user has **at least one** client role that matches.

By default, hasRole checks for keycloak client roles.

* Example: `hasRole('admin')` will check the logged in user has the client role named admin.

It also is possible to check for realm roles and application roles.
* `hasRole('realm:admin')` will check the logged in user has the admin realm role
* `hasRole('some-other-app:admin')` will check the loged in user has the admin realm role in a different application

### hasPermission Usage and Options

**`@hasPermission` directive**

The syntax for the `@hasPermission` schema directive is `@hasPermission(resources: "resource:scope")` or  `@hasPermission(resources: "resource")` because a scope is  optional or for multiple resources `@hasPermission(resources: ["array", "of", "resources"])`, use colon to separate name of the resource and optionally its scope.

**`hasPermission`**

* The usage for the exported `hasPermission` function is `hasPremission('resource:scope')` or `hasPermission(['array', 'of', 'resources'])`, use colon to separate name of the resource and optionally its scope.

Both the `@hasPermission` schema directive and the exported `hasPermission` function work exactly the same.

* If a single string is provided, it returns true if the keycloak user has a permission for requested resource and its scope, if the scope is provided.
* If an array of strings is provided, it returns true if the keycloak user has **all** requested permissions.

## Apollo Server Express 3+ Support

`apollo-server-express@^3.x` no longer supports the `SchemaDirectiveVisitor` class and therefor prevents
you from using the visitors of this library. They have adopted schema 
[transformers functions](https://www.apollographql.com/docs/apollo-server/schema/creating-directives/) that define behavior
on the schema fields with the directives.

Remediating this is actually rather simple and gives you the option of adding a bit more authentication logic if needed,
but will require some understanding of the inner workings of this library.

To make things easy, this is an example implementation of what the transformers may look like. (Note the validation of roles and permissions
given to their respective directives):

```typescript
import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { auth, hasPermission, hasRole } from 'keycloak-connect-graphql';

const authDirectiveTransformer = (schema: GraphQLSchema, directiveName: string = 'auth') => {
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
          if (typeof resources === 'string') resources = [resources];
          if (Array.isArray(resources)) {
            resources = resources.map((val: any) => String(val));
          } else {
            throw new Error('invalid hasRole args. role must be a String or an Array of Strings');
          }
        } else {
          throw Error("invalid hasRole args. must contain only a 'role argument");
        }
        fieldConfig.resolve = hasPermission(resources)(resolve);
      }
      return fieldConfig;
    }
  });
};

export const roleDirectiveTransformer = (schema: GraphQLSchema, directiveName: string = 'hasRole') => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const roleDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (roleDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        const keys = Object.keys(roleDirective);
        let role;
        if (keys.length === 1 && keys[0] === 'role') {
          role = roleDirective[keys[0]];
          if (typeof role === 'string') role = [role];
          if (Array.isArray(role)) {
            role = role.map((val: any) => String(val));
          } else {
            throw new Error('invalid hasRole args. role must be a String or an Array of Strings');
          }
        } else {
          throw Error("invalid hasRole args. must contain only a 'role argument");
        }
        fieldConfig.resolve = hasRole(role)(resolve);
      }
      return fieldConfig;
    }
  });
};

export const applyDirectiveTransformers = (schema: GraphQLSchema) => {
  return authDirectiveTransformer(roleDirectiveTransformer(permissionDirectiveTransformer(schema)));
};
```

With your transformers defined, apply them on the schema and continue configuring your server instance:
```typescript
...
let schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

schema = applyDirectiveTransformers(schema);

// Now just passing the schema in the options, configurting the context with Keycloak as before.
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return {
      kauth: new KeycloakContext({ req }, keycloak)
    };
  }
});
...
```

### Error Codes

Library will return specific GraphQL errors to the client that can
be differenciated by using error codes.

Example response from GraphQL Server could look as follows:

```json
{
   "errors":[
      {
        "message":"User is not authorized. Must have one of the following roles: [admin]",
        "code": "FORBIDDEN"
      }
   ]
}
```

Possible error codes: 

- `UNAUTHENTICATED`: returned when user is not authenticated to access API because it requires login
- `FORBIDDEN`: returned when user do not have permission to perform operation 


