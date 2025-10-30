import { useEffect, useState } from 'react';
import type { Project } from '../services/storage';
import { StorageService } from '../services/storage';
import { exportProject, type ExportFormat } from '../utils/export';

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
   * Callback when a project is updated (name/description changed)
   */
  onProjectUpdate?: () => void;

  /**
   * Callback to force save current project before export
   */
  onForceSave?: () => Promise<void>;

  /**
   * ID of the currently active project (to know which one to force save)
   */
  currentProjectId?: string;

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
  onProjectUpdate,
  onForceSave,
  currentProjectId,
  isOpen,
  onClose,
}: ProjectManagerProps) {
  // Edit modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Export menu state
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingProject) {
          setEditingProject(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, editingProject]);

  // Handle edit project
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingProject) return;

    try {
      await StorageService.updateProject(editingProject.id, {
        title: editTitle.trim() || 'Untitled Project',
        description: editDescription.trim(),
      });
      setEditingProject(null);
      onProjectUpdate?.();
    } catch (error) {
      console.error('[ProjectManager] Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  // Handle export project
  const handleExportProject = async (
    project: Project,
    format: ExportFormat,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      // If exporting the current project, force save first to get latest content
      if (project.id === currentProjectId && onForceSave) {
        console.log(`[ProjectManager] Force saving current project before export`);
        await onForceSave();
        // Refresh the project from storage to get the latest content
        const updatedProject = await StorageService.getProject(project.id);
        if (updatedProject) {
          project = updatedProject;
        }
      }

      exportProject(project, format);
      setExportingProjectId(null);
      console.log(`[ProjectManager] Exported project ${project.id} as ${format}`);
    } catch (error) {
      console.error('[ProjectManager] Export failed:', error);
      alert('Failed to export project. Please try again.');
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      role="region"
      aria-labelledby="project-manager-title"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--border-muted)',
          flexShrink: 0,
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
          onClick={onClose}
          aria-label="Close project manager"
          style={{
            width: '32px',
            height: '32px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-2)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
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
          padding: '32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
            gap: '16px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* New Project Card */}
          <button
            onClick={onProjectCreate}
            aria-label="Create new project"
            style={{
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '2px dashed var(--border)',
              background: 'transparent',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
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
              width="40"
              height="40"
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
                height: '180px',
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

              {/* Project Description or Date */}
              {project.description ? (
                <p
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    margin: '0 0 12px 0',
                    fontStyle: 'italic',
                  }}
                >
                  {project.description}
                </p>
              ) : (
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
              )}

              {/* Content Preview */}
              <p
                style={{
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                  margin: 0,
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: project.description ? 3 : 4,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.5',
                }}
              >
                {project.content || 'No content yet...'}
              </p>

              {/* Action buttons */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }}
                className="project-actions"
              >
                {/* Export Button with dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="flint-btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportingProjectId(exportingProjectId === project.id ? null : project.id);
                    }}
                    aria-label={`Export project: ${project.title}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </button>

                  {exportingProjectId === project.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        minWidth: '140px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-soft)',
                        padding: '4px',
                        zIndex: 10,
                      }}
                    >
                      <button
                        onClick={(e) => handleExportProject(project, 'txt', e)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-xs)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-3)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Text (.txt)
                      </button>
                      <button
                        onClick={(e) => handleExportProject(project, 'md', e)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-xs)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-3)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Markdown (.md)
                      </button>
                      <button
                        onClick={(e) => handleExportProject(project, 'html', e)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-xs)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-3)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        HTML (.html)
                      </button>
                      <button
                        onClick={(e) => handleExportProject(project, 'docx', e)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-xs)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-3)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Docs (.doc)
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  className="flint-btn ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProject(project);
                  }}
                  aria-label={`Edit project: ${project.title}`}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>

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
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
            </div>
          ))}
        </div>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setEditingProject(null)}
        >
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-soft)',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 'var(--fs-lg)',
                fontWeight: 600,
                color: 'var(--text)',
                margin: '0 0 20px 0',
              }}
            >
              Edit Project
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="project-title"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 500,
                  color: 'var(--text)',
                  marginBottom: '8px',
                }}
              >
                Project Name
              </label>
              <input
                id="project-title"
                type="text"
                className="flint-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Untitled Project"
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="project-description"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 500,
                  color: 'var(--text)',
                  marginBottom: '8px',
                }}
              >
                Description (optional)
              </label>
              <textarea
                id="project-description"
                className="flint-input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="flint-btn ghost" onClick={() => setEditingProject(null)}>
                Cancel
              </button>
              <button className="flint-btn primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .flint-card:hover .project-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
