import { Check } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import type { VisibleStep } from '../types.ts';

interface Props {
  visibleStep: VisibleStep;
  t: (key: string) => string;
}

const STEPS: { id: VisibleStep; labelKey: string; hintKey: string }[] = [
  { id: 'choose-folder',  labelKey: 'progressChooseFolder',  hintKey: 'progressChooseFolderDescription' },
  { id: 'review-plan',   labelKey: 'progressReviewMapping',  hintKey: 'progressReviewMappingDescription' },
  { id: 'confirm-copy',  labelKey: 'progressConfirmCopy',    hintKey: 'progressConfirmCopyDescription' },
];

const ORDER: VisibleStep[] = ['choose-folder', 'review-plan', 'confirm-copy'];

export function ProgressTracker({ visibleStep, t }: Props) {
  const current = ORDER.indexOf(visibleStep);

  return (
    <nav aria-label={t('progressLabel')} className="border-b border-border bg-card/40 px-6 py-4">
      <ol className="mx-auto flex max-w-3xl items-center">
        {STEPS.map((step, index) => {
          const isComplete = index < current;
          const isActive   = index === current;
          return (
            <li key={step.id} className="flex flex-1 items-center last:flex-none">
              <span className="group flex items-center gap-3 text-left">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                    isComplete && 'border-brand bg-brand text-brand-foreground',
                    isActive  && 'border-brand bg-brand-muted text-foreground',
                    !isComplete && !isActive && 'border-border bg-transparent text-muted-foreground',
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </span>
                <span className="hidden flex-col sm:flex">
                  <span className={cn(
                    'text-sm font-medium leading-tight',
                    isActive || isComplete ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {t(step.labelKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t(step.hintKey)}</span>
                </span>
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-4 h-px flex-1 transition-colors',
                    index < current ? 'bg-brand' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
