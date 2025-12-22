import {
    DragDropContext,
    Draggable,
    Droppable,
    DropResult,
} from "@hello-pangea/dnd";
import { FaPlus } from "react-icons/fa";
import { FiChevronRight } from "react-icons/fi";

type Task = {
    id: string;
    title: string;
    priority?: string;
    description?: string;
    assignedTo?: string;
    progressPercent?: string;
    createdAt?: string;
    updatedAt?: string;
    statusId?: string;
    statusLabel?: string;
    subtasks?: any[];
};

type Board = {
    id: string;
    title: string;
    tasks: Task[];
    isDefault: boolean;
    color?: string;
};

interface BoardViewProps {
    boards: Board[];
    canManageTasks: boolean;
    handleDragEnd: (result: DropResult) => void;
    handleOpenTaskModal: (task: Task) => void;
    setOpenModalIsDefault: (open: boolean) => void;
    t: (key: string) => string;
    priorityConfig: any;
    getProgressValue: (val: any) => number;
    getProgressAppearance: (val: number) => { gradient: string; glowColor: string };
}

export default function BoardView({
    boards,
    canManageTasks,
    handleDragEnd,
    handleOpenTaskModal,
    setOpenModalIsDefault,
    t,
    priorityConfig,
    getProgressValue,
    getProgressAppearance,
}: BoardViewProps) {
    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4">
                {boards.map((board) => {
                    const tasks = board.tasks ?? [];

                    return (
                        <Droppable droppableId={board.id} key={board.id} isDropDisabled={!canManageTasks}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.5)] transition-all duration-200 hover:border-primary-200/60 hover:shadow-[0_18px_38px_-24px_rgba(15,23,42,0.45)] ${snapshot.isDraggingOver ? "ring-2 ring-primary-200/60" : ""}`}
                                    style={{
                                        width: "20rem",
                                        maxHeight: "82vh",
                                        flexShrink: 0,
                                        borderTop: `6px solid ${board.color ?? "#e2e8f0"}`,
                                    }}
                                >
                                    <div
                                        className="flex items-center justify-between rounded-t-xl px-5 py-4 text-sm text-slate-700"
                                        style={{
                                            background: "#ffffff",
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600"
                                                style={{
                                                    color: board.color ?? "#1f2937",
                                                }}
                                            >
                                                {(board.title ?? "?").slice(0, 2)}
                                            </div>
                                            <div>
                                                <h2 className="font-semibold text-base leading-tight">
                                                    {board.title}
                                                </h2>
                                                <span className="text-xs text-slate-400">
                                                    {tasks.length} {t('project.tasks')}
                                                </span>
                                            </div>
                                        </div>
                                        {board.isDefault && canManageTasks && (
                                            <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500"
                                                type="button"
                                                aria-label="Add task"
                                                onClick={() => {
                                                    setOpenModalIsDefault(true)
                                                }}
                                            >
                                                <FaPlus size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        className="flex-1 overflow-y-auto p-4"
                                        style={{
                                            height: "calc(82vh - 110px)",
                                        }}
                                    >
                                        {tasks.length === 0 && (
                                            <div className="flex h-[130px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                                                {t('project.drop_card_here')}
                                            </div>
                                        )}

                                        {tasks.map((task, index) => {
                                            const priorityMeta = task.priority ? priorityConfig[task.priority] : undefined;
                                            const badgeClass = priorityMeta?.badgeClass ?? "border-slate-200 bg-slate-100 text-slate-500";
                                            const dotClass = priorityMeta?.dotClass ?? "bg-slate-400";
                                            const priorityLabel = priorityMeta?.label ?? (task.priority ? `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}` : "No Priority");
                                            const progressValue = getProgressValue(task.progressPercent);
                                            const hasProgress = task.progressPercent != null && task.progressPercent !== "";
                                            const progressAppearance = getProgressAppearance(progressValue);

                                            return (
                                                <Draggable
                                                    key={task.id}
                                                    draggableId={task.id}
                                                    index={index}
                                                    isDragDisabled={!canManageTasks}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] transition-all duration-200 ${snapshot.isDragging
                                                                ? "scale-[1.01] border-primary-200 shadow-[0_18px_38px_-24px_rgba(59,130,246,0.35)]"
                                                                : "hover:border-primary-200 hover:shadow-[0_16px_30px_-24px_rgba(59,130,246,0.22)]"
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <h3 className="text-sm font-semibold leading-snug text-slate-800">
                                                                    {task.title}
                                                                </h3>
                                                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-500">
                                                                    #{task.id}
                                                                </span>
                                                            </div>

                                                            {hasProgress && (
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                                        <span>{t('project.progress')}</span>
                                                                        <span className="text-slate-500">{progressValue}%</span>
                                                                    </div>
                                                                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                                        <div
                                                                            className="progress-bar-fill absolute inset-y-0 left-0 rounded-full"
                                                                            style={{
                                                                                width: `${progressValue}%`,
                                                                                background: progressAppearance.gradient,
                                                                                backgroundSize: "200% 100%",
                                                                                ["--glow-color" as any]: progressAppearance.glowColor,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                                                <div
                                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold uppercase tracking-wide ${badgeClass}`}
                                                                >
                                                                    <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                                                                    {priorityLabel}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                                                                    onClick={() => handleOpenTaskModal(task)}
                                                                >
                                                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                    {t('project.view_details')}
                                                                    <FiChevronRight size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <span className="h-1 w-1 rounded-full bg-primary-200" />
                                                                    {t('project.drag_to_change_status')}
                                                                </span>
                                                                <FiChevronRight className="text-slate-300" size={13} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}

                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
