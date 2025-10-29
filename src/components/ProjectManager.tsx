import { useEffect } from 'react';
import type { Project } from '../services/storage';

/**
 * ProjectManager component props
 */
export interface ProjectManagerProps {
  /**
   * Array of all projects
   */
  projects: Project[];

  /**
   * Callback when a project is selected
   */
  onProjectSelect: (projectId: string) => void;

  /**
   * Callback when creating a new project
   */
  onProjectCreate: () => void;

  /**
   * Callback when deleting a project
   */
  onProjectDelete?: (projectId: string) => void;

  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback to close the modal
   */
  onClose: () => void;
}

/**
 * ProjectManager modal component
 * Full-screen modal for managing multiple writing projects
 */
export function ProjectManager({
  projects,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  isOpen,
  onClose,
}: ProjectManagerProps) {
  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-manager-title"
    >
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-soft)',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <h2
            id="project-manager-title"
            style={{
              fontSize: 'var(--fs-xl)',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Projects
          </h2>
          <button
            className="flint-btn ghost"
            onClick={onClose}
            aria-label="Close project manager"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Project Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* New Project Card */}
            <button
              className="flint-card"
              onClick={onProjectCreate}
              aria-label="Create new project"
              style={{
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px dashed var(--border)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ color: 'var(--text-muted)' }}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span
                style={{
                  fontSize: 'var(--fs-md)',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                }}
              >
                New Project
              </span>
            </button>

            {/* Existing Project Cards */}
            {projects.map((project) => (
              <div
                key={project.id}
                className="flint-card"
                style={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
                onClick={() => onProjectSelect(project.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-muted)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open project: ${project.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onProjectSelect(project.id);
                  }
                }}
              >
                {/* Project Title */}
                <h3
                  style={{
                    fontSize: 'var(--fs-lg)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: '0 0 8px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.title || 'Untitled Project'}
                </h3>

                {/* Project Date */}
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    margin: '0 0 12px 0',
                  }}
                >
                  {new Date(project.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>

                {/* Content Preview */}
                <p
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    margin: 0,
                    flex: 1,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.5',
                  }}
                >
                  {project.content || 'No content yet...'}
                </p>

                {/* Delete Button (if callback provided) */}
                {onProjectDelete && (
                  <button
                    className="flint-btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Are you sure you want to delete "${project.title || 'Untitled Project'}"? This action cannot be undone.`
                        )
                      ) {
                        onProjectDelete(project.id);
                      }
                    }}
                    aria-label={`Delete project: ${project.title}`}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
