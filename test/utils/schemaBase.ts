import {KeycloakTypeDefs} from '../../src';

export const SchemaBase = `#graphql
${KeycloakTypeDefs}
type Query {
    xyz: Boolean
}
`;
