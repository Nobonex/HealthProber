import { IPagination } from '@app/shared/components/paginator/models/pagination.interface';

export interface IProjectListRequest extends IPagination {
    search: string | null;
}
