import { SortingOrder } from './sorting-order.enum';

export interface IPagination {
    take: number,
    skip: number,
    sortingHeader: string,
    sortingOrder: SortingOrder,
}

export const defaultPagination = ({ sortBy }: { sortBy: string }): IPagination => ({
    skip: 0,
    take: 10,
    sortingOrder: SortingOrder.Ascending,
    sortingHeader: sortBy,
});
