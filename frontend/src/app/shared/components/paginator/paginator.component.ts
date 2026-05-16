import { Component, computed, input, model } from '@angular/core';
import { IPagination } from '@app/shared/components/paginator/models/pagination.interface';

@Component({
    selector: 'health-prober-paginator',
    templateUrl: './paginator.component.html',
    imports: [],
    styleUrls: ['./paginator.component.less']
})
export class PaginatorComponent {
    public readonly $pagination = model.required<IPagination>();
    public readonly $totalItems = input.required<number>();

    protected readonly $currentPage = computed(() => this.$pagination().skip / this.$pagination().take + 1);
    protected readonly $hasPrevious = computed(() => this.$pagination().skip > 0);
    protected readonly $hasNext = computed(() => this.$totalItems() - this.$pagination().skip - this.$pagination().take > 0);

    protected previousPage(): void {
        this.$pagination.update((pagination) => ({ ...pagination, skip: pagination.skip - pagination.take }));
    }

    protected nextPage(): void {
        this.$pagination.update((pagination) => ({ ...pagination, skip: pagination.skip + pagination.take }));
    }
}
