import React, { useState } from 'react';
import { User, GameState } from '../types';
import { Button, Input, Modal, Select } from './ui';
import { format } from 'date-fns';
import { UserCircle, Swords, BookOpen, Clock, Settings, UserPlus, Upload, X } from 'lucide-react';

interface AdminPanelProps {
  state: GameState;
  admin: User;
}

export function AdminPanel({ state, admin }: AdminPanelProps) {
  const students = state.users.filter(u => u.role === 'student');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateAbilityOpen, setIsCreateAbilityOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-full w-full max-w-7xl mx-auto gap-6 p-4">
      
      {/* Left Column - Students List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col h-1/2">
          <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="font-serif text-lg text-amber-500/90 font-medium">Ученики ({students.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {students.map(s => (
              <button 
                key={s.id} 
                onClick={() => setSelectedStudent(s)}
                className="w-full text-left p-3 rounded-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
              >
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-500">
                    <UserCircle size={24} />
                  </div>
                )}
                <span className="text-zinc-200 font-serif">{s.username}</span>
              </button>
            ))}
            {students.length === 0 && <div className="text-zinc-500 text-center py-8 text-sm">Нет зарегистрированных учеников</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm flex flex-col gap-3">
          <h3 className="font-serif text-amber-500/90 mb-2">Создание сущностей</h3>
          <Button onClick={() => setIsCreateItemOpen(true)} className="w-full justify-start gap-2">
            <BookOpen size={18} /> Создать предмет
          </Button>
          <Button onClick={() => setIsCreateAbilityOpen(true)} className="w-full justify-start gap-2">
            <Swords size={18} /> Создать способность
          </Button>
          <Button onClick={() => setIsImportJsonOpen(true)} className="w-full justify-start gap-2" variant="secondary">
            <Upload size={18} /> Импорт из JSON
          </Button>
        </div>
      </div>

      {/* Middle/Right Column - Profile or Logs */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        {selectedStudent ? (
          <StudentProfile adminView student={selectedStudent} state={state} onClose={() => setSelectedStudent(null)} />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex-1 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-zinc-900 to-zinc-900 pointer-events-none" />
            <div className="bg-zinc-950/80 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
              <h2 className="font-serif text-xl text-amber-500/90 font-medium tracking-wide">Arcane Logs</h2>
              <Clock size={18} className="text-zinc-500" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
              {state.logs.map(log => (
                <div key={log.id} className="text-sm p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-sm">
                  <div className="text-zinc-500 text-xs mb-1 font-mono">
                    {format(new Date(log.createdAt), 'HH:mm:ss')}
                  </div>
                  <div className="text-zinc-300">
                    {log.message}
                  </div>
                </div>
              ))}
              {state.logs.length === 0 && (
                <div className="text-zinc-500 text-center py-8">Пустота...</div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateItemModal isOpen={isCreateItemOpen} onClose={() => setIsCreateItemOpen(false)} />
      <CreateAbilityModal isOpen={isCreateAbilityOpen} onClose={() => setIsCreateAbilityOpen(false)} />
      <ImportJsonModal isOpen={isImportJsonOpen} onClose={() => setIsImportJsonOpen(false)} />
    </div>
  );
}

// Additional components for Profile & Modals below

function StudentProfile({ adminView, student, state, onClose }: { adminView?: boolean, student: User, state: GameState, onClose: () => void }) {
  const [photoUrl, setPhotoUrl] = useState(student.photoUrl || '');
  const [isGiveItemOpen, setIsGiveItemOpen] = useState(false);
  const [isTeachAbilityOpen, setIsTeachAbilityOpen] = useState(false);

  const studentItems = state.userItems.filter(ui => ui.userId === student.id).map(ui => {
    const item = state.items.find(i => i.id === ui.itemId);
    return { ...ui, item };
  });

  const studentAbilities = state.userAbilities.filter(ua => ua.userId === student.id).map(ua => {
    const ability = state.abilities.find(a => a.id === ua.abilityId);
    return { ...ua, ability };
  });

  const handleUpdatePhoto = async () => {
    await fetch('/api/admin/update-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: student.id, photoUrl })
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex-1 flex flex-col overflow-hidden">
      <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-start">
        <div className="flex gap-4 items-center">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-red-900/50" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-red-900/50 text-zinc-500">
              <UserCircle size={32} />
            </div>
          )}
          <div>
            <h2 className="font-serif text-2xl text-red-50 font-medium">{student.username}</h2>
            <div className="text-zinc-500 text-sm">Ученик</div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">Закрыть</button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        <div className="space-y-2">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Photo URL</label>
          <div className="flex gap-2">
            <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." />
            <Button onClick={handleUpdatePhoto} variant="secondary">Сохранить</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg text-zinc-200">Инвентарь</h3>
              <Button onClick={() => setIsGiveItemOpen(true)} variant="secondary" className="text-xs py-1 px-2">Выдать предмет</Button>
            </div>
            <div className="space-y-2">
              {studentItems.map(ui => ui.item && (
                <div key={ui.id} className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-sm">
                  <div className="font-medium text-red-100">{ui.item.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{ui.item.description}</div>
                </div>
              ))}
              {studentItems.length === 0 && <div className="text-zinc-600 text-sm">Пусто</div>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg text-zinc-200">Способности</h3>
              <Button onClick={() => setIsTeachAbilityOpen(true)} variant="secondary" className="text-xs py-1 px-2">Обучить</Button>
            </div>
            <div className="space-y-2">
              {studentAbilities.map(ua => ua.ability && (
                <div key={ua.id} className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-sm group relative">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-amber-200/90">{ua.ability.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900 px-1 rounded-sm border border-zinc-800">
                        {ua.ability.type === 'active' ? 'Актив' : 'Пассив'}
                      </span>
                      <button 
                        onClick={async () => {
                          await fetch('/api/admin/remove-ability', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userAbilityId: ua.id })
                          });
                        }}
                        className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Забыть способность"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 pr-6">{ua.ability.description}</div>
                </div>
              ))}
              {studentAbilities.length === 0 && <div className="text-zinc-600 text-sm">Нет способностей</div>}
            </div>
          </div>
        </div>
      </div>

      <GiveItemModal isOpen={isGiveItemOpen} onClose={() => setIsGiveItemOpen(false)} studentId={student.id} items={state.items} />
      <TeachAbilityModal isOpen={isTeachAbilityOpen} onClose={() => setIsTeachAbilityOpen(false)} studentId={student.id} abilities={state.abilities} />
    </div>
  );
}

function CreateItemModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = async () => {
    await fetch('/api/admin/create-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc })
    });
    setName(''); setDesc('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать предмет">
      <div className="space-y-4">
        <Input placeholder="Название предмета" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        <Button onClick={submit} className="w-full">Создать</Button>
      </div>
    </Modal>
  );
}

function CreateAbilityModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('active');
  const [target, setTarget] = useState('self');
  const [cooldown, setCooldown] = useState('10');

  const submit = async () => {
    await fetch('/api/admin/create-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, type, target, cooldown: Number(cooldown) })
    });
    setName(''); setDesc(''); setCooldown('10');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать способность">
      <div className="space-y-4">
        <Input placeholder="Название способности" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        
        <Select value={type} onChange={e => setType(e.target.value)}>
          <option value="active">Активная</option>
          <option value="passive">Пассивная</option>
        </Select>

        <Select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="self">На себя</option>
          <option value="ally">На союзника</option>
        </Select>

        {type === 'active' && (
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Кулдаун (секунд)</label>
            <Input type="number" min="0" value={cooldown} onChange={e => setCooldown(e.target.value)} />
          </div>
        )}

        <Button onClick={submit} className="w-full">Создать</Button>
      </div>
    </Modal>
  );
}

function GiveItemModal({ isOpen, onClose, studentId, items }: { isOpen: boolean, onClose: () => void, studentId: number, items: any[] }) {
  const [itemId, setItemId] = useState(items[0]?.id || '');
  
  const submit = async () => {
    if (!itemId) return;
    await fetch('/api/admin/grant-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentId, itemId })
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выдать предмет">
      <div className="space-y-4">
        <Select value={itemId} onChange={e => setItemId(e.target.value)}>
          <option value="">Выберите предмет...</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <Button onClick={submit} className="w-full" disabled={!itemId}>Выдать</Button>
      </div>
    </Modal>
  );
}

function TeachAbilityModal({ isOpen, onClose, studentId, abilities }: { isOpen: boolean, onClose: () => void, studentId: number, abilities: any[] }) {
  const [abilityId, setAbilityId] = useState(abilities[0]?.id || '');
  
  const submit = async () => {
    if (!abilityId) return;
    await fetch('/api/admin/teach-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentId, abilityId })
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Обучить способности">
      <div className="space-y-4">
        <Select value={abilityId} onChange={e => setAbilityId(e.target.value)}>
          <option value="">Выберите способность...</option>
          {abilities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Button onClick={submit} className="w-full" disabled={!abilityId}>Обучить</Button>
      </div>
    </Modal>
  );
}

function ImportJsonModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json })
      });

      if (!res.ok) throw new Error('Ошибка при импорте');
      
      onClose();
    } catch (err) {
      setError('Неверный формат JSON файла или ошибка сервера');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Импорт из JSON">
      <div className="space-y-4">
        <div className="text-xs text-zinc-400 space-y-2 bg-zinc-950 p-3 rounded-sm border border-zinc-800 font-mono">
          <p>Пример структуры файла:</p>
          <pre className="text-[10px] text-amber-500/70 overflow-x-auto">
{`[
  {
    "username": "Renat",
    "type": "ability",
    "name": "Fireball",
    "description": "Огненный шар",
    "abilityType": "active",
    "target": "ally",
    "cooldown": 10
  },
  {
    "username": "Renat",
    "type": "item",
    "name": "Зелье здоровья",
    "description": "Восстанавливает ХП"
  }
]`}
          </pre>
        </div>
        
        {error && <div className="text-red-500 text-xs">{error}</div>}

        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-zinc-700 rounded-sm hover:border-red-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer text-zinc-300">
          <span className="font-serif">{loading ? 'Загрузка...' : 'Выбрать .json файл'}</span>
          <input type="file" accept=".json" className="hidden" onChange={handleFileChange} disabled={loading} />
        </label>
      </div>
    </Modal>
  );
}
