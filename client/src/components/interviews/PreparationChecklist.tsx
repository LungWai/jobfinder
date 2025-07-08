import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  PlusIcon, 
  TrashIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  category: 'research' | 'preparation' | 'logistics' | 'custom';
}

const defaultChecklistItems: Omit<ChecklistItem, 'id'>[] = [
  { text: 'Research company background and culture', completed: false, category: 'research' },
  { text: 'Review job description and requirements', completed: false, category: 'research' },
  { text: 'Check recent company news and updates', completed: false, category: 'research' },
  { text: 'Prepare STAR examples for behavioral questions', completed: false, category: 'preparation' },
  { text: 'Practice common interview questions', completed: false, category: 'preparation' },
  { text: 'Prepare questions to ask the interviewer', completed: false, category: 'preparation' },
  { text: 'Review your resume and portfolio', completed: false, category: 'preparation' },
  { text: 'Plan your route or test video setup', completed: false, category: 'logistics' },
  { text: 'Prepare professional attire', completed: false, category: 'logistics' },
  { text: 'Print copies of resume and references', completed: false, category: 'logistics' },
];

const PreparationChecklist: React.FC = () => {
  const { id: interviewId } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    // Load saved checklist from localStorage
    const savedChecklist = localStorage.getItem(`interview-checklist-${interviewId}`);
    if (savedChecklist) {
      setChecklist(JSON.parse(savedChecklist));
    } else {
      // Initialize with default items
      const initialChecklist = defaultChecklistItems.map((item, index) => ({
        ...item,
        id: `default-${index}`,
      }));
      setChecklist(initialChecklist);
    }
  }, [interviewId]);

  useEffect(() => {
    // Save checklist to localStorage whenever it changes
    if (checklist.length > 0) {
      localStorage.setItem(`interview-checklist-${interviewId}`, JSON.stringify(checklist));
    }
  }, [checklist, interviewId]);

  const toggleItem = (itemId: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: newItemText,
      completed: false,
      dueDate: newItemDueDate || undefined,
      category: 'custom',
    };

    setChecklist(prev => [...prev, newItem]);
    setNewItemText('');
    setNewItemDueDate('');
    setShowAddForm(false);
  };

  const deleteItem = (itemId: string) => {
    setChecklist(prev => prev.filter(item => item.id !== itemId));
  };

  const filteredChecklist = checklist.filter(item => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const completionPercentage = Math.round(
    (checklist.filter(item => item.completed).length / checklist.length) * 100
  );

  const categoryIcons = {
    research: '🔍',
    preparation: '📝',
    logistics: '🗓️',
    custom: '⭐',
  };

  const categoryColors = {
    research: 'bg-blue-50 border-blue-200',
    preparation: 'bg-green-50 border-green-200',
    logistics: 'bg-purple-50 border-purple-200',
    custom: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          <ClipboardDocumentCheckIcon className="inline w-6 h-6 mr-2" />
          Interview Preparation Checklist
        </h2>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{checklist.filter(item => item.completed).length} of {checklist.length} completed</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-4 mb-4 border-b">
        {(['all', 'pending', 'completed'] as const).map(filterOption => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              filter === filterOption
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Checklist Items */}
      <div className="space-y-2 mb-4">
        {filteredChecklist.map(item => (
          <div
            key={item.id}
            className={`flex items-start p-3 rounded-lg border ${
              categoryColors[item.category]
            } ${item.completed ? 'opacity-75' : ''}`}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="mr-3 mt-0.5 flex-shrink-0"
            >
              {item.completed ? (
                <CheckCircleSolidIcon className="w-5 h-5 text-green-600" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
            
            <div className="flex-grow">
              <div className="flex items-start justify-between">
                <div className="flex-grow">
                  <span className={`${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    <span className="mr-2">{categoryIcons[item.category]}</span>
                    {item.text}
                  </span>
                  {item.dueDate && (
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <CalendarDaysIcon className="w-4 h-4 mr-1" />
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                {item.category === 'custom' && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      {showAddForm ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="space-y-3">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter new checklist item..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex space-x-3">
              <input
                type="date"
                value={newItemDueDate}
                onChange={(e) => setNewItemDueDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewItemText('');
                  setNewItemDueDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <PlusIcon className="inline w-5 h-5 mr-2" />
          Add Custom Item
        </button>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Preparation Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Complete research items at least 2 days before the interview</li>
          <li>• Practice your responses out loud, not just in your head</li>
          <li>• Have backup plans for technical issues if it's a video interview</li>
          <li>• Get a good night's sleep before the interview day</li>
        </ul>
      </div>
    </div>
  );
};

export default PreparationChecklist;