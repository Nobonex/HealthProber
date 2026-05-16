import { InjectionToken } from '@angular/core';
import { IConfig } from './config.interface';

export const CONFIG = new InjectionToken<IConfig>('config');
