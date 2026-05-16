import { Component, computed, input, model } from '@angular/core';
import { IPagination } from '@app/shared/components/paginator/models/pagination.interface';
import { SortingOrder } from '@app/shared/components/paginator/models/sorting-order.enum';

@Component({
    selector: 'health-prober-sorting-header',
    templateUrl: './sorting-header.component.html',
    imports: [],
    styleUrls: ['./sorting-header.component.less']
})
export class SortingHeaderComponent {
    public readonly $sortingHeader = input.required<string>();
    public readonly $pagination = model.required<IPagination>();

    protected readonly $isActive = computed(() => this.$pagination().sortingHeader === this.$sortingHeader());
    protected readonly $sortingOrder = computed(() => this.$isActive() ? this.$pagination().sortingOrder : null);

    protected readonly SortingOrder = SortingOrder;

    protected sortBy(): void {
        this.$pagination.update((pagination) => ({
            ...pagination,
            sortingHeader: this.$sortingHeader(),
            sortingOrder: this.$isActive() && pagination.sortingOrder === SortingOrder.Ascending
                ? SortingOrder.Descending
                : SortingOrder.Ascending,
            skip: 0,
        }));
    }
}
