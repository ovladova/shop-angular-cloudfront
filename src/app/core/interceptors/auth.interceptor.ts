import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { CredentialService } from "../credential.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private credentialService: CredentialService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authorizationToken = this.credentialService.getAuthorizationToken();

    if (authorizationToken) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Basic ${authorizationToken}`,
        },
      });

      return next.handle(clonedRequest);
    }

    console.warn('Authorization token not found. Proceeding without Authorization header.');
    return next.handle(req);
  }
}
