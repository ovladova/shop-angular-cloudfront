import { Injectable } from '@angular/core';
import { CONFIG_TOKEN } from './injection-tokens/config.token';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CredentialService {
  private readonly config = inject(CONFIG_TOKEN);

  storeCredentials(): void {
    const { user } = this.config;

    if (user?.username && user?.password) {
      const encodedCredentials = btoa(`${user.username}:${user.password}`);
      localStorage.setItem('authorization_token', encodedCredentials);
      console.log('Credentials stored in localStorage successfully.');
    } else {
      console.error('User credentials are missing in the configuration.');
    }
  }

  getAuthorizationToken(): string | null {
    return localStorage.getItem('authorization_token');
  }
}
