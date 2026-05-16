import { IPaginatedListResponse } from '@app/shared/components/paginator/models/paginated-list.response';

export type ProjectListResponse = IPaginatedListResponse<IProjectListItemResponsePart>;

export interface IProjectListItemResponsePart {
    id: number;
    name: string;
    contactPersonEmail: string;
}
