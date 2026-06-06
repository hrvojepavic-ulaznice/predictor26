import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HomeLeaderboardComponent } from './home-leaderboard/home-leaderboard.component';

@Component({
  selector: 'app-home-page',
  imports: [HomeLeaderboardComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {}
