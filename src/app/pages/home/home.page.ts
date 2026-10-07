import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent
  ]
})
export class HomePage {

  constructor(
    private tmdbService: TmdbService
  ) { }

  async testTmdb(): Promise<void> {

    console.log('BUTTON CLICKED');

    try {

      const data = await this.tmdbService.getPopularMovies();

      console.log('TMDB SUCCESS:', data);
      console.log('Movies:', data.results);

      alert(
        `TMDB works! ${data.results.length} movies received.`
      );

    } catch (error) {

      console.error('TMDB ERROR:', error);

      alert(
        'TMDB ERROR — check the browser console.'
      );
    }
  }
}