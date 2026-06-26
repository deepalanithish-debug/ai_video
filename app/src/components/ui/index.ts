/* ───────────────────────────────────────────────────────────────────────────
   VydeoAI UI — the single reusable component library.
   Every page/feature composes from these. See DESIGN_SYSTEM.md.
   ─────────────────────────────────────────────────────────────────────────── */

/* Atoms */
export { default as Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'
export { default as IconButton } from './IconButton'
export type { IconButtonProps, IconButtonSize } from './IconButton'
export { default as Spinner } from './Spinner'
export type { SpinnerProps, SpinnerSize, SpinnerVariant } from './Spinner'
export { default as Badge } from './Badge'
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge'

/* Surfaces */
export { Card, CardHeader, CardContent, CardFooter } from './Card'
export type { CardProps, CardSectionProps, CardVariant } from './Card'
export { default as Panel } from './Panel'
export type { PanelProps, PanelVariant } from './Panel'

/* Forms */
export { Input, Textarea, SearchInput, PromptInput } from './Input'
export type { InputProps, TextareaProps, SearchInputProps, PromptInputProps, InputSize } from './Input'
export { default as Select } from './Select'
export type { SelectProps, SelectOption } from './Select'
export { default as Toggle } from './Toggle'
export type { ToggleProps } from './Toggle'
export { default as Checkbox } from './Checkbox'
export type { CheckboxProps } from './Checkbox'
export { RadioGroup } from './Radio'
export type { RadioGroupProps, RadioOption } from './Radio'
export { default as Slider } from './Slider'
export type { SliderProps } from './Slider'
export { default as Segmented } from './Segmented'
export type { SegmentedProps, SegmentedOption } from './Segmented'
export { Dropzone, UploadCard } from './Upload'
export type { DropzoneProps, UploadCardProps } from './Upload'

/* Overlays & feedback */
export { Modal, ConfirmDialog } from './Modal'
export type { ModalProps, ModalSize, ConfirmDialogProps } from './Modal'
export { ToastProvider, useToast } from './Toast'
export type { ToastOptions, ToastVariant } from './Toast'
export { default as Tooltip } from './Tooltip'
export type { TooltipProps, TooltipSide } from './Tooltip'
export { Tabs, TabPanel } from './Tabs'
export type { TabsProps, TabItem, TabPanelProps } from './Tabs'
export { default as ProgressBar } from './ProgressBar'
export type { ProgressBarProps } from './ProgressBar'

/* States */
export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar } from './Skeleton'
export type { SkeletonProps, SkeletonTextProps, SkeletonCardProps, SkeletonAvatarProps } from './Skeleton'
export { default as EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'
export { default as ErrorState } from './ErrorState'
export type { ErrorStateProps } from './ErrorState'

/* Icons */
export { Icons } from './icons'
export type { IconName } from './icons'
