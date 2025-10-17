export class CreateProjectDto {
    name: string
    description: string
    priority: string
    status: string
    join: boolean
    created_by: string
    team: string[]
}
