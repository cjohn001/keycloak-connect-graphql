import Keycloak, {AuthZRequest, Grant} from 'keycloak-connect';
import * as express from 'express';
import {KeycloakContext, KeycloakContextBase, KeycloakSubscriptionContext, GrantedRequest} from '../src';
import {AuthorizationConfiguration} from '../src/KeycloakPermissionsHandler';

test('KeycloakContextBase accessToken is the access_token in req.kauth', () => {
    const token = {
        hasRole: (_role: string) => {
            return true;
        },
        isExpired: () => {
            return false;
        }
    } as Keycloak.Token;

    const provider = new KeycloakContextBase(token);
    expect(provider.accessToken).toEqual(token);
});

test('KeycloakSubscriptionContext accessToken is the access_token in req.kauth', () => {
    const token = {
        hasRole: (_role: string) => {
            return true;
        },
        isExpired: () => {
            return false;
        }
    } as Keycloak.Token;

    const provider = new KeycloakSubscriptionContext(token);
    expect(provider.accessToken).toEqual(token);
});

test('KeycloakContext accessToken is the access_token in req.kauth', () => {
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasRole: (_role: string) => {
                        return true;
                    },
                    isExpired: () => {
                        return false;
                    }
                }
            }
        }
    } as GrantedRequest;

    const provider = new KeycloakContext({req});
    const token = req.kauth?.grant?.access_token;
    expect(provider.accessToken).toEqual(token);
});

test('KeycloakContext hasRole calls hasRole in the access_token', () => {
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasRole: jest.fn((_role: string) => {
                        return true;
                    }),
                    isExpired: () => {
                        return false;
                    }
                }
            }
        }
    } as any as GrantedRequest;

    const provider = new KeycloakContext({req});
    expect(provider.hasRole('')).toBeTruthy();
});

test('KeycloakContext.isAuthenticated is true when token is defined and isExpired returns false', () => {
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasRole: (_role: string) => {
                        return true;
                    },
                    isExpired: () => {
                        return false;
                    }
                }
            }
        }
    } as GrantedRequest;

    const provider = new KeycloakContext({req});
    expect(provider.isAuthenticated()).toBeTruthy();
});

test('KeycloakContext.isAuthenticated is false when token is defined but isExpired returns true', () => {
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasRole: (_role: string) => {
                        return true;
                    },
                    isExpired: () => {
                        return true;
                    }
                }
            }
        }
    } as GrantedRequest;

    const provider = new KeycloakContext({req});
    expect(provider.isAuthenticated()).toBeFalsy();
});

test('KeycloakContext.hasRole is false if token is expired', () => {
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasRole: (_role: string) => {
                        return true;
                    },
                    isExpired: () => {
                        return true;
                    }
                }
            }
        }
    } as GrantedRequest;

    const provider = new KeycloakContext({req});
    expect(provider.hasRole('')).toBeFalsy();
});

test('KeycloakContext.hasPermission is false when keycloak and authorization objects are undefined', async () => {
    const req = {
        kauth: {
            grant: {}
        }
    } as GrantedRequest;

    const provider = new KeycloakContext({req});
    await expect(provider.hasPermission('')).resolves.toBeFalsy();
});

test('KeycloakContext.hasPermission is true when keycloak and authorization objects are defined and access_token returns hasPermission true', async () => {
    const keycloak = {
        checkPermissions(_authzRequest: AuthZRequest, _request: express.Request, _callback?: (json: any) => any): Promise<Grant> {
            return new Promise<Grant>((resolve, _reject) => {
                const result = {
                    access_token: {
                        hasPermission: (_r: string, _s?: string): boolean => {
                            return true;
                        }
                    }
                } as unknown as Grant;
                return resolve(result);
            });
        }
    } as Keycloak.Keycloak;
    const req = {
        kauth: {
            grant: {
                access_token: {
                    hasPermission: (_r: string, _s?: string): boolean => {
                        return false;
                    }
                }
            }
        }
    } as unknown as GrantedRequest;
    const config = {
        resource_server_id: 'resource-server'
    } as AuthorizationConfiguration;

    const provider = new KeycloakContext({req}, keycloak, config);
    await expect(provider.hasPermission('Article:view')).resolves.toBeTruthy();
});
