import { Component, computed, inject, OnInit, DestroyRef, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabComponent, NzTabsComponent } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthConfig, SiteConfig, SiteEndpoint } from '@app/core/models/health-prober/site-config.model';
import { AuthStorageService } from '@app/core/services/auth-storage.service';
import { HealthProbeService } from '@app/core/services/health-probe.service';
import { ProbeResult } from '@app/core/models/health-prober/probe-result.model';

@Component({
    selector: 'health-prober-site-form-modal',
    imports: [
        ReactiveFormsModule,
        NzButtonModule,
        NzFormModule,
        NzIconModule,
        NzInputModule,
        NzModalModule,
        NzSelectModule,
        NzTabComponent,
        NzTabsComponent,
        NzTooltipModule,
    ],
    templateUrl: './site-form-modal.component.html',
    styleUrl: './site-form-modal.component.less',
})
export class SiteFormModalComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly modalRef = inject(NzModalRef);
    private readonly authStorage = inject(AuthStorageService);
    private readonly probeService = inject(HealthProbeService);
    private readonly message = inject(NzMessageService);

    private readonly destroyRef = inject(DestroyRef);

    public site: SiteConfig | undefined;

    protected readonly $currentTab = signal<number>(0);
    protected readonly $isReview = computed(() => this.$currentTab() === 4);
    protected readonly $testResult = signal<ProbeResult | null>(null);
    protected readonly $isTesting = signal<boolean>(false);
    protected readonly $authType = signal<string>('none');
    protected readonly $reviewData = computed(() => {
        const value = this.form.getRawValue();
        return {
            name: value.name,
            url: value.endpoints[0]?.url ?? '',
            method: value.endpoints[0]?.method ?? 'GET',
            headers: value.endpoints[0]?.headers ?? [],
            queryParams: value.endpoints[0]?.queryParams ?? [],
            authType: value.authType,
            warningThresholdMs: value.warningThresholdMs,
            criticalThresholdMs: value.criticalThresholdMs,
            pollingIntervalMs: value.pollingIntervalMs,
        };
    });

    protected form: FormGroup = this.buildForm();

    public constructor() {
        this.form.controls['authType'].valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value: string) => {
                this.$authType.set(value);
            });
    }

    public ngOnInit(): void {
        if (this.site !== undefined) {
            this.patchForm(this.site);
        }
    }

    protected nextTab(): void {
        if (this.$currentTab() < 4) {
            this.$currentTab.update((t) => t + 1);
        }
    }

    protected prevTab(): void {
        if (this.$currentTab() > 0) {
            this.$currentTab.update((t) => t - 1);
        }
    }

    protected addHeader(): void {
        this.headersArray.push(
            this.fb.group({
                key: ['', Validators.required],
                value: ['', Validators.required],
            }),
        );
    }

    protected removeHeader(index: number): void {
        this.headersArray.removeAt(index);
    }

    protected addQueryParam(): void {
        this.queryParamsArray.push(
            this.fb.group({
                key: ['', Validators.required],
                value: ['', Validators.required],
            }),
        );
    }

    protected removeQueryParam(index: number): void {
        this.queryParamsArray.removeAt(index);
    }

    protected get headersArray(): FormArray {
        const endpoints = this.form.controls['endpoints'] as FormArray;
        const first = endpoints.at(0) as FormGroup;
        return first.controls['headers'] as FormArray;
    }

    protected get queryParamsArray(): FormArray {
        const endpoints = this.form.controls['endpoints'] as FormArray;
        const first = endpoints.at(0) as FormGroup;
        return first.controls['queryParams'] as FormArray;
    }

    protected testConnection(): void {
        const site = this.buildSiteConfig();
        if (site.endpoints.length === 0) {
            this.message.warning('Please configure an endpoint first.');
            return;
        }
        this.$isTesting.set(true);
        this.$testResult.set(null);
        this.probeService.probe(site.id, site.endpoints[0])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.$testResult.set(result);
                    this.$isTesting.set(false);
                },
                error: (err: ProbeResult) => {
                    this.$testResult.set(err);
                    this.$isTesting.set(false);
                },
            });
    }

    protected save(): void {
        if (this.form.invalid) {
            this.message.error('Please fix validation errors before saving.');
            return;
        }
        const site = this.buildSiteConfig();
        this.saveAuth(site.id);
        this.modalRef.close(site);
    }

    protected cancel(): void {
        this.modalRef.destroy();
    }

    private buildForm(): FormGroup {
        return this.fb.group({
            name: ['', [Validators.required]],
            endpoints: this.fb.array([
                this.fb.group({
                    id: [crypto.randomUUID()],
                    url: ['', [Validators.required]],
                    method: ['GET'],
                    headers: this.fb.array([]),
                    queryParams: this.fb.array([]),
                }),
            ]),
            authType: ['none'],
            bearerToken: [''],
            basicUsername: [''],
            basicPassword: [''],
            warningThresholdMs: [2000, [Validators.required, Validators.min(1)]],
            criticalThresholdMs: [5000, [Validators.required, Validators.min(1)]],
            pollingIntervalMs: [30000],
        }, { validators: this.thresholdsValidator });
    }

    private patchForm(site: SiteConfig): void {
        const auth = this.authStorage.load(site.id);
        this.form.patchValue({
            name: site.name,
            authType: auth.type,
            bearerToken: auth.type === 'bearer' ? auth.token : '',
            basicUsername: auth.type === 'basic' ? auth.username : '',
            basicPassword: auth.type === 'basic' ? auth.password : '',
            warningThresholdMs: site.warningThresholdMs,
            criticalThresholdMs: site.criticalThresholdMs,
            pollingIntervalMs: site.pollingIntervalMs,
        });

        const endpoint = site.endpoints[0];
        if (endpoint !== undefined) {
            const endpointsArray = this.form.controls['endpoints'] as FormArray;
            const first = endpointsArray.at(0) as FormGroup;
            first.patchValue({
                id: endpoint.id,
                url: endpoint.url,
                method: endpoint.method,
            });

            this.headersArray.clear();
            for (const h of endpoint.headers) {
                this.headersArray.push(
                    this.fb.group({ key: [h.key, Validators.required], value: [h.value, Validators.required] }),
                );
            }

            this.queryParamsArray.clear();
            for (const p of endpoint.queryParams) {
                this.queryParamsArray.push(
                    this.fb.group({ key: [p.key, Validators.required], value: [p.value, Validators.required] }),
                );
            }
        }
    }

    private buildSiteConfig(): SiteConfig {
        const value = this.form.getRawValue();
        const existing = this.site;
        return {
            id: existing?.id ?? crypto.randomUUID(),
            name: value.name,
            endpoints: value.endpoints.map((ep: SiteEndpoint) => ({
                id: ep.id,
                url: ep.url,
                method: ep.method,
                headers: ep.headers.filter((h: { key: string }) => h.key),
                queryParams: ep.queryParams.filter((p: { key: string }) => p.key),
            })),
            auth: this.buildAuth(value),
            warningThresholdMs: value.warningThresholdMs,
            criticalThresholdMs: value.criticalThresholdMs,
            pollingIntervalMs: value.pollingIntervalMs,
        };
    }

    private buildAuth(value: Record<string, unknown>): AuthConfig {
        const authType = value['authType'] as string;
        if (authType === 'bearer') {
            return { type: 'bearer', token: value['bearerToken'] as string };
        }
        if (authType === 'basic') {
            return { type: 'basic', username: value['basicUsername'] as string, password: value['basicPassword'] as string };
        }
        return { type: 'none' };
    }

    private saveAuth(siteId: string): void {
        const auth = this.buildAuth(this.form.getRawValue());
        this.authStorage.save(siteId, auth);
    }

    private thresholdsValidator(group: FormGroup): Record<string, boolean> | null {
        const warning = group.controls['warningThresholdMs'].value as number;
        const critical = group.controls['criticalThresholdMs'].value as number;
        if (warning >= critical) {
            return { thresholds: true };
        }
        return null;
    }
}
