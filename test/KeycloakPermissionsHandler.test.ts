import Keycloak, { AuthZRequest, Grant, Token } from 'keycloak-connect';
import * as express from 'express';
import { AuthorizationConfiguration, KeycloakPermissionsHandler } from '../src/KeycloakPermissionsHandler';

test('KeycloakPermissionsHandler.hasPermissions returns false when there is no token', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = undefined;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token,  config);
    await expect(handler.hasPermission('Article:view')).resolves.toEqual(false);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when resources is an empty array', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {} as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token,  config);
    await expect(handler.hasPermission([])).toBeTruthy();
});

test('KeycloakPermissionsHandler.hasPermissions returns true when expected resource and scope match', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s: string | undefined): boolean => {
            return r === 'Article' && s === 'view';
        }
    } as unknown as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token ,  config);
    await expect(handler.hasPermission('Article:view')).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when expected resource and scope were found in array', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s: string | undefined): boolean => {
            return r === 'Article' && s === 'view';
        }
    } as unknown as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token ,  config);
    await expect(handler.hasPermission(['Article:view'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns false when expected resource was not found', async () => {
    const keycloak = {} as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s: string | undefined): boolean => {
            return r === 'Article' && s === 'view';
        }
    } as unknown as Token;

    const config = {
        resource_server_id: 'resource-server'
    } as AuthorizationConfiguration;

    const handler = new KeycloakPermissionsHandler(keycloak, token ,  config);
    await expect(await handler.hasPermission(['Article1:view'])).toEqual(false);
});

test('KeycloakPermissionsHandler.hasPermissions returns false when expected scope was not found', async () => {
    const keycloak = {
        getConfig: () => {
            return {
                resource: 'resource-server'
            };
        }
    } as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s: string | undefined): boolean => {
            return r === 'Article' && s === 'view';
        }
    } as unknown as Token;

    const handler = new KeycloakPermissionsHandler(keycloak, token, undefined);
    await expect(handler.hasPermission(['Article:view1'])).resolves.toEqual(false);
});

test('KeycloakPermissionsHandler.hasPermissions returns false when at least one resource and scope were not found', async () => {
    const keycloak = {} as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s: string | undefined): boolean => {
            return r === 'Article' && s === 'view';
        }
    } as unknown as Token;
    const config = {
        resource_server_id: 'resource-server',
        claims: () => undefined
    } as AuthorizationConfiguration;

    const handler = new KeycloakPermissionsHandler(keycloak, token , config);
    await expect(handler.hasPermission(['Article:view', 'Article:delete'])).resolves.toEqual(false);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when all resources and scopes were found', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s?: string): boolean => {
            return r === 'Article' && (s === 'view' || s === 'delete');
        }
    } as unknown as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token,  config);
    await expect(handler.hasPermission(['Article:view', 'Article:delete'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when resource without scopes found', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, _s?: string) => {
            return r === 'Article';
        }
    } as unknown as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token,  config);
    await expect(handler.hasPermission(['Article'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when resource name contains ":" and scope is found', async () => {
    const keycloak = {
        getConfig: (): string => {
            return 'resource-server';
        }
    } as unknown as Keycloak.Keycloak;
    const token = {
        hasPermission: (r: string, s?: string): boolean => {
            return r === 'Article:123456' && s === 'read';
        }
    } as unknown as Token;
    const config = {} as AuthorizationConfiguration;
    const handler = new KeycloakPermissionsHandler(keycloak, token,  config);
    await expect(handler.hasPermission(['Article:123456:read'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions uses claims defined in configuration when it asks keycloak to checkPermissions', async () => {
    const keycloak = {
        checkPermissions(authzRequest: AuthZRequest, _request: express.Request, _callback?: (json: any) => any): Promise<Grant> {
            return new Promise<Grant>((resolve, reject) => {
                const actual = JSON.parse(Buffer.from(authzRequest.claim_token!, 'base64').toString());
                const hasAllClaims = actual.claim1 === 'claim1' && actual.claim2 === 'claim2';
                const result = {
                    access_token: {
                        hasPermission: (_: string, __?: string): boolean => {
                            return true;
                        }
                    }
                } as unknown as Grant;
                hasAllClaims ? resolve(result) : reject(result);
            });
        }
    } as Keycloak.Keycloak;
    const token = {
        hasPermission: (): boolean => {
            return false;
        }
    } as unknown as Token;
    const config = {
        resource_server_id: 'resource-server',
        claims: (_request: express.Request) => {
            return {
                claim1: 'claim1',
                claim2: 'claim2'
            };
        }
    } as AuthorizationConfiguration;

    const handler = new KeycloakPermissionsHandler(keycloak, token ,  config);
    await expect(handler.hasPermission(['Article:view', 'Article:delete'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns true when access token from authorization request returns true', async () => {
    const keycloak = {
        checkPermissions(_authzRequest: AuthZRequest, _request: express.Request): Promise<Grant> {
            return new Promise<Grant>((resolve) => {
                const result = {
                    access_token: {
                        hasPermission: (): boolean => {
                            return true;
                        }
                    }
                } as unknown as Grant;
                return resolve(result);
            });
        }
    } as Keycloak.Keycloak;
    const token = {
        hasPermission: (): boolean => {
            return false;
        }
    } as unknown as Token;
    const config = {
        resource_server_id: 'resource-server'
    } as AuthorizationConfiguration;

    const handler = new KeycloakPermissionsHandler(keycloak, token, config);
    await expect(handler.hasPermission(['Article:view', 'Article:delete'])).resolves.toEqual(true);
});

test('KeycloakPermissionsHandler.hasPermissions returns false when access token from authorization request returns false', async () => {
    const keycloak = {
        checkPermissions(_authzRequest: AuthZRequest, _request: express.Request): Promise<Grant> {
            return new Promise<Grant>((resolve) => {
                const result = {
                    access_token: {
                        hasPermission: (): boolean => {
                            return false;
                        }
                    }
                } as unknown as Grant;
                return resolve(result);
            });
        }
    } as Keycloak.Keycloak;
    const token = {
        hasPermission: (): boolean => {
            return false;
        }
    } as unknown as Token;
    const config = {
        resource_server_id: 'resource-server'
    } as AuthorizationConfiguration;

    const handler = new KeycloakPermissionsHandler(keycloak, token, config);
    await expect(handler.hasPermission(['Article:view', 'Article:delete'])).resolves.toEqual(false);
});
