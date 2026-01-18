/*
 * Copyright (c) 2024-2026 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { App, Modal, requestUrl } from "obsidian";
import * as ReactDOM from 'react-dom/client';
import * as Tabs from "@radix-ui/react-tabs";
import { NMPSettings } from "src/settings";
import { useEffect, useState, useRef } from "react";
import { CaretSortIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";

import styles from "./workflow.module.css";

const PluginHost = 'https://obplugin.dualhue.cn';

interface Token {
  id: string;
  name: string;
  appid: string;
  expireat: string;
  created: string;
}

interface Notification {
  id: number;
  type: 'success' | 'error';
  title: string;
  description?: string;
}

export function Workflow() {
  const settings = NMPSettings.getInstance();
  const authkey = settings.authKey;
  const wxInfo = settings.wxInfo;

  // Refs for portal containers
  const accountSelectRef = useRef<HTMLDivElement>(null);
  const expirySelectRef = useRef<HTMLDivElement>(null);

  // State for create form
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [tokenName, setTokenName] = useState<string>('');
  const [selectedExpiry, setSelectedExpiry] = useState<string>('2592000'); // 30 days in seconds
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // State for manage tab
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [hasLoadedTokens, setHasLoadedTokens] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationIdRef = useState(0);

  const notify = (data: { type: 'success' | 'error'; title: string; description?: string }) => {
    const id = notificationIdRef[0]++;
    setNotifications(prev => [...prev, { ...data, id }]);
    
    // Auto dismiss success notifications after 3 seconds
    if (data.type === 'success') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    }
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    // Set default account if available
    if (wxInfo.length > 0 && !selectedAccount) {
      setSelectedAccount(wxInfo[0].appid);
    }
  }, [wxInfo, selectedAccount]);

  useEffect(() => {
    // Load tokens only on first visit to manage tab
    if (activeTab === 'manage' && !hasLoadedTokens) {
      loadTokens();
      setHasLoadedTokens(true);
    }
  }, [activeTab, hasLoadedTokens]);

  const createToken = async (name: string, appid: string, appsecret: string, expireat: number) => {
    try {
      const res = await requestUrl({
        method: 'POST',
        url: PluginHost + '/v1/workflow/token',
        throw: false,
        contentType: 'application/json',
        body: JSON.stringify({
          name,
          authkey,
          appid,
          appsecret,
          expireat,
        })
      });

      return res;
    }
    catch (err) {
      console.log(err);
      throw err;
    }
  }

  const listToken = async () => {
    try {
      const res = await requestUrl({
        method: 'GET',
        url: PluginHost + '/v1/workflow/token/list/' + authkey,
        throw: false,
      });
      return res;
    }
    catch (err) {
      console.log(err);
      throw err;
    }
  }

  const loadTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const res = await listToken();
      if (res.status === 200 && res.json.code === 0) {
        setTokens(res.json.tokens || []);
      } else {
        console.error('Failed to load tokens:', res.json);
      }
    } catch (err) {
      console.error('Error loading tokens:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleToggleToken = (id: string) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTokens(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedTokens.size === tokens.length) {
      setSelectedTokens(new Set());
    } else {
      setSelectedTokens(new Set(tokens.map(t => t.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedTokens.size === 0) return;
    setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    setConfirmDelete(false);
    try {
      // Delete all selected tokens
      for (const id of selectedTokens) {
        await deleteToken(id);
      }
      // Refresh the list
      await loadTokens();
      setSelectedTokens(new Set());
    } catch (err) {
      console.error('Error deleting tokens:', err);
      notify({ type: 'error', title: '删除失败', description: err.message });
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
  };

  const deleteToken = async (id: string) => {
    const res = await requestUrl({
      method: 'DELETE',
      url: PluginHost + '/v1/workflow/token',
      throw: false,
      contentType: 'application/json',
      body: JSON.stringify({
        authkey,
        id,
      })
    });
    if (res.status === 200 && res.json.code === 0) {
      return;
    } else {
      console.error('Failed to delete token:', res.json);
      throw new Error(res.json?.error || '删除失败，未知原因');
    }
  }

  const handleGenerate = async () => {
    // Validation
    if (!tokenName.trim()) {
      notify({ type: 'error', title: '名称不能为空' });
      return;
    }

    if (tokenName.length > 64) {
      notify({ type: 'error', title: '名称长度不能超过64个字符' });
      return;
    }

    if (!selectedAccount) {
      notify({ type: 'error', title: '请选择公众号账号' });
      return;
    }

    // Calculate expiry in seconds
    let expirySeconds: number;
    if (selectedExpiry === 'custom') {
      const customSeconds = parseInt(customExpiry);
      if (isNaN(customSeconds) || customSeconds <= 0) {
        notify({ type: 'error', title: '请输入有效的自定义有效期（秒数）' });
        return;
      }

      const maxSeconds = 365 * 24 * 60 * 60; // 365 days in seconds
      if (customSeconds > maxSeconds) {
        notify({ type: 'error', title: '自定义有效期不能超过365天' });
        return;
      }

      expirySeconds = customSeconds;
    } else {
      expirySeconds = parseInt(selectedExpiry);
    }

    // Find selected account info
    const account = wxInfo.find(wx => wx.appid === selectedAccount);
    if (!account) {
      notify({ type: 'error', title: '未找到选中的账号信息' });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await createToken(tokenName, account.appid, account.secret, expirySeconds);
      if (res.status === 200) {
        // Success - show success and reset form
        setTokenName('');
        setCustomExpiry('');
        setSelectedExpiry('2592000'); // Reset to 30 days
        // Show the generated token
        if (res.json?.jwt) {
          setGeneratedToken(res.json.jwt);
        }
        // Refresh token list
        loadTokens();
      } else {
        console.error('Failed to create token:', res.json);
        notify({ type: 'error', title: '生成失败', description: res.json?.error || '' });
      }
    } catch (err) {
      console.error('Error creating token:', err);
      notify({ type: 'error', title: '生成失败', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const presetOptions = [
    { label: '1天', value: String(1 * 24 * 60 * 60) },
    { label: '7天', value: String(7 * 24 * 60 * 60) },
    { label: '30天', value: String(30 * 24 * 60 * 60) },
    { label: '90天', value: String(90 * 24 * 60 * 60) },
    { label: '180天', value: String(180 * 24 * 60 * 60) },
    { label: '365天', value: String(365 * 24 * 60 * 60) },
  ];

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken);
      notify({ type: 'success', title: '已复制到剪贴板' });
      setHasCopied(true);
    } catch (err) {
      notify({ type: 'error', title: '复制失败' });
    }
  };

  const handleCloseResult = () => {
    setGeneratedToken('');
    setHasCopied(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.Container}>
      <div className={styles.Header}>
        <span style={{fontSize: '18px', fontWeight: 'bold'}}>工作流Token管理</span><span>&nbsp;|&nbsp;</span><a href="https://docs.dualhue.cn" target="_blank">帮助文档</a>
      </div>

      <Tabs.Root defaultValue="create" value={activeTab} onValueChange={setActiveTab} className={styles.Root}>
        <Tabs.List className={styles.List}>
          <Tabs.Trigger className={styles.Trigger} value="create">创建</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="manage">管理</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="create" className={styles.Content}>
          <div className={styles.Form}>
            <div className={styles.FormGroup}>
              <label className={styles.Label}>公众号账号</label>
              <div ref={accountSelectRef} className={styles.SelectWrapper}>
                <Select.Root value={selectedAccount} onValueChange={setSelectedAccount}>
                  <Select.Trigger className={styles.SelectTrigger}>
                    <Select.Value placeholder="暂无账号，请先在设置中添加" />
                    <Select.Icon className={styles.SelectIcon}>
                      <CaretSortIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal container={accountSelectRef.current || undefined}>
                    <Select.Content className={styles.SelectContent} position="popper" sideOffset={5}>
                      <Select.ScrollUpButton className={styles.SelectScrollButton}>
                        <ChevronUpIcon />
                      </Select.ScrollUpButton>
                      <Select.Viewport className={styles.SelectViewport}>
                        {wxInfo.length === 0 ? (
                          <Select.Item value="" className={styles.SelectItem} disabled>
                            <Select.ItemText>暂无账号</Select.ItemText>
                          </Select.Item>
                        ) : (
                          wxInfo.map((wx) => (
                            <Select.Item key={wx.appid} value={wx.appid} className={styles.SelectItem}>
                              <Select.ItemText>{wx.name}</Select.ItemText>
                              <Select.ItemIndicator className={styles.SelectItemIndicator}>
                                <CheckIcon />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))
                        )}
                      </Select.Viewport>
                      <Select.ScrollDownButton className={styles.SelectScrollButton}>
                        <ChevronDownIcon />
                      </Select.ScrollDownButton>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>

            <div className={styles.FormGroup}>
              <label className={styles.Label}>名称</label>
              <input
                type="text"
                className={styles.Input}
                placeholder="为Token命名，最多64个字符"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                maxLength={64}
              />
              <span className={styles.CharCount}>{tokenName.length}/64</span>
            </div>

            <div className={styles.FormGroup}>
              <label className={styles.Label}>有效期</label>
              <div ref={expirySelectRef} className={styles.SelectWrapper}>
                <Select.Root value={selectedExpiry} onValueChange={setSelectedExpiry}>
                  <Select.Trigger className={styles.SelectTrigger}>
                    <Select.Value />
                    <Select.Icon className={styles.SelectIcon}>
                      <CaretSortIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal container={expirySelectRef.current || undefined}>
                    <Select.Content className={styles.SelectContent} position="popper" sideOffset={5}>
                      <Select.ScrollUpButton className={styles.SelectScrollButton}>
                        <ChevronUpIcon />
                      </Select.ScrollUpButton>
                      <Select.Viewport className={styles.SelectViewport}>
                        {presetOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value} className={styles.SelectItem}>
                            <Select.ItemText>{option.label}</Select.ItemText>
                            <Select.ItemIndicator className={styles.SelectItemIndicator}>
                              <CheckIcon />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                        <Select.Item value="custom" className={styles.SelectItem}>
                          <Select.ItemText>自定义</Select.ItemText>
                          <Select.ItemIndicator className={styles.SelectItemIndicator}>
                            <CheckIcon />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                      <Select.ScrollDownButton className={styles.SelectScrollButton}>
                        <ChevronDownIcon />
                      </Select.ScrollDownButton>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              
              {selectedExpiry === 'custom' && (
                <input
                  type="number"
                  className={styles.Input}
                  placeholder={`最大 ${365 * 24 * 60 * 60} 秒（365天）`}
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  min="1"
                  max={365 * 24 * 60 * 60}
                />
              )}
            </div>

            <button 
              className={styles.GenerateButton}
              onClick={handleGenerate}
              disabled={isGenerating || wxInfo.length === 0}
            >
              {isGenerating ? '生成中...' : '生成'}
            </button>
          </div>
        </Tabs.Content>
        <Tabs.Content value="manage" className={styles.Content}>
          <div className={styles.ManageContainer}>
            {isLoadingTokens ? (
              <div className={styles.LoadingMessage}>加载中...</div>
            ) : tokens.length === 0 ? (
              <div className={styles.EmptyMessage}>暂无JWT令牌</div>
            ) : (
              <table className={styles.TokenTable}>
                <thead>
                  <tr>
                    <th className={styles.CheckboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedTokens.size === tokens.length && tokens.length > 0}
                        onChange={handleToggleAll}
                      />
                    </th>
                    <th>名称</th>
                    <th>公众号</th>
                    <th>创建时间</th>
                    <th>过期时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const account = wxInfo.find(wx => wx.appid === token.appid);
                    return (
                      <tr key={token.id}>
                        <td className={styles.CheckboxCell}>
                          <input
                            type="checkbox"
                            checked={selectedTokens.has(token.id)}
                            onChange={() => handleToggleToken(token.id)}
                          />
                        </td>
                        <td>{token.name}</td>
                        <td>{account?.name || token.appid}</td>
                        <td>{formatDate(token.created)}</td>
                        <td>{formatDate(token.expireat)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className={styles.ManageFooter}>
              <button 
                className={styles.DeleteButton}
                onClick={handleDelete}
                disabled={selectedTokens.size === 0}
              >
                删除选中 {selectedTokens.size > 0 && `(${selectedTokens.size})`}
              </button>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* JWT Token Result Overlay */}
      {generatedToken && (
        <div className={styles.ResultOverlay}>
          <div className={styles.ResultModal}>
            <div className={styles.ResultHeader}>
              <div className={styles.ResultWarning}>
                ⚠️ Token仅显示一次，请妥善保管
              </div>
            </div>
            <div className={styles.ResultContent}>
              <div className={styles.ResultLabel}>生成的Token：</div>
              <div className={styles.ResultToken}>{generatedToken}</div>
            </div>
            <div className={styles.ResultActions}>
              <button className={styles.CopyButton} onClick={handleCopyToken}>
                复制Token
              </button>
              <button className={styles.CloseButton} onClick={handleCloseResult} disabled={!hasCopied}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className={styles.ResultOverlay}>
          <div className={styles.ResultModal}>
            <div className={styles.ResultHeader}>
              <div className={styles.ResultWarning}>
                ⚠️ 确认删除
              </div>
            </div>
            <div className={styles.ResultContent}>
              <div className={styles.ResultLabel}>
                确定要删除选中的 {selectedTokens.size} 个Token吗？
              </div>
              <div className={styles.ConfirmMessage}>
                此操作不可恢复，请谨慎操作。
              </div>
            </div>
            <div className={styles.ResultActions}>
              <button className={styles.CopyButton} onClick={confirmDeleteAction}>
                确认删除
              </button>
              <button className={styles.CloseButton} onClick={cancelDelete}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notifications */}
      <div className={styles.NotificationContainer}>
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={styles.Notification} 
            data-type={notification.type}
          >
            <div className={styles.NotificationContent}>
              <div className={styles.NotificationTitle}>{notification.title}</div>
              {notification.description && (
                <div className={styles.NotificationDescription}>{notification.description}</div>
              )}
            </div>
            <button 
              className={styles.NotificationClose}
              onClick={() => dismissNotification(notification.id)}
            >&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export class WorkflowModal extends Modal {
  view: ReactDOM.Root | null = null;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    this.view = ReactDOM.createRoot(contentEl);
    this.view.render(<Workflow />);
  }

  onClose() {
    let { contentEl } = this;
    this.view?.unmount();
    this.view = null;
    contentEl.empty();
  }
}