const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const targetStr = `        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        
        <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={isStackable} 
            onChange={e => setIsStackable(e.target.checked)}
            className="accent-amber-500 rounded-sm bg-zinc-900 border-zinc-700 w-4 h-4"
          />
          Может стакаться (накапливаться)
        </label>

        <Button onClick={submit} className="w-full">{initialData ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </Modal>`;

const replacement = `        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        
        <Select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="self">На себя</option>
          <option value="ally">На союзника</option>
        </Select>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Длительность эффекта на цели (секунд, 0 = без эффекта)</label>
          <Input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        
        <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={isStackable} 
            onChange={e => setIsStackable(e.target.checked)}
            className="accent-amber-500 rounded-sm bg-zinc-900 border-zinc-700 w-4 h-4"
          />
          Может стакаться (накапливаться)
        </label>

        <Button onClick={submit} className="w-full">{initialData ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </Modal>`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
