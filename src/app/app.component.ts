import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CredentialService } from "./core/credential.service";
import { HeaderComponent } from './core/header/header.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [HeaderComponent, RouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private credentialService: CredentialService) {}

  ngOnInit(): void {
    this.credentialService.storeCredentials();
  }
}
