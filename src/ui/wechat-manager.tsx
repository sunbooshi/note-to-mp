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

import { useEffect, useRef, useState } from "react";
import { App, Modal, Notice } from "obsidian";
import * as ReactDOM from 'react-dom/client';
import { PlusIcon } from "@radix-ui/react-icons";
import { NMPSettings } from "src/settings";
import { ConfigStore, createConfigStore, ConfigContext, useConfigContext } from "src/store/ConfigStore";
import AccountSelect from "src/ui/components/AccountSelect";
import {
    wxGetToken,
    wxDraftBatchget,
    wxDraftDelete,
    wxBatchGetMaterial,
    wxUploadImage,
    wxGetMaterial,
    DraftBatchItem,
} from "src/weixin-api";
import styles from "./wechat-manager.module.css";

const DRAFT_PAGE_SIZE = 10;
const MATERIAL_PAGE_SIZE = 20;
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;

type Tab = 'draft' | 'material';

interface MaterialItem {
    media_id: string;
    name: string;
    update_time: number;
    url: string;
}

async function getToken(appid: string): Promise<string> {
    const settings = NMPSettings.getInstance();
    if (!settings.authKey) {
        throw new Error('请先在设置中填写注册码（AuthKey）');
    }
    const wx = settings.wxInfo.find(w => w.appid === appid);
    if (!wx) {
        throw new Error('未找到公众号配置，请在设置中添加公众号');
    }
    const res = await wxGetToken(settings.authKey, appid, wx.secret.replace('SECRET', ''));
    if (res.status !== 200) {
        throw new Error('获取token失败：' + (res.json?.message || res.text));
    }
    const token = res.json.token;
    if (!token) {
        throw new Error('获取token失败：' + res.json.message);
    }
    return token;
}

class ConfirmModal extends Modal {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;

    constructor(app: App, title: string, message: string, onConfirm: () => void | Promise<void>) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: this.title });
        contentEl.createEl('p', { text: this.message });
        const btnGroup = contentEl.createDiv({ cls: styles.ConfirmButtons });
        btnGroup.createEl('button', { text: '取消' })
            .addEventListener('click', () => this.close());
        btnGroup.createEl('button', { text: '确认删除', cls: 'mod-warning' })
            .addEventListener('click', () => {
                this.close();
                this.onConfirm();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

function WechatManagerInternal({ modal }: { modal: Modal }) {
    const appid = useConfigContext(s => s.appid);

    const [tab, setTab] = useState<Tab>('draft');
    const [draftPage, setDraftPage] = useState(0);
    const [materialPage, setMaterialPage] = useState(0);
    const [draftTick, setDraftTick] = useState(0);
    const [materialTick, setMaterialTick] = useState(0);

    const [drafts, setDrafts] = useState<DraftBatchItem[]>([]);
    const [draftTotal, setDraftTotal] = useState(0);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [materialTotal, setMaterialTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

    const coverUrlsRef = useRef<Record<string, string>>({});
    const fileRef = useRef<HTMLInputElement>(null);

    // 切换公众号时重置分页
    useEffect(() => {
        setDraftPage(0);
        setMaterialPage(0);
    }, [appid]);

    // 草稿列表加载
    useEffect(() => {
        if (!appid || tab !== 'draft') return;
        let cancelled = false;
        setLoading(true);

        // 清理上一页的封面 objectURL
        Object.values(coverUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
        coverUrlsRef.current = {};
        setCoverUrls({});

        (async () => {
            try {
                const token = await getToken(appid);
                const data = await wxDraftBatchget(token, draftPage * DRAFT_PAGE_SIZE, DRAFT_PAGE_SIZE, 0);
                if (cancelled) return;
                if (data.errcode) {
                    throw new Error(data.errmsg || `错误码 ${data.errcode}`);
                }
                const items = data.item || [];
                setDrafts(items);
                setDraftTotal(data.total_count || 0);

                // 通过永久素材接口获取封面图片
                const urls: Record<string, string> = {};
                await Promise.allSettled(items.map(async item => {
                    const mediaId = item.content?.news_item?.[0]?.thumb_media_id;
                    if (!mediaId) return;
                    try {
                        const res = await wxGetMaterial(token, mediaId);
                        if (res.status === 200 && res.arrayBuffer
                            && !(res.text || '').trimStart().startsWith('{')) {
                            urls[item.media_id] = URL.createObjectURL(
                                new Blob([res.arrayBuffer], { type: 'image/jpeg' })
                            );
                        }
                    } catch (error) {
                        console.warn('获取草稿封面失败：' + error.message);
                    }
                }));
                if (cancelled) {
                    Object.values(urls).forEach(url => URL.revokeObjectURL(url));
                    return;
                }
                coverUrlsRef.current = urls;
                setCoverUrls(urls);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    new Notice('获取草稿失败：' + error.message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [appid, tab, draftPage, draftTick]);

    // 永久素材列表加载
    useEffect(() => {
        if (!appid || tab !== 'material') return;
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const token = await getToken(appid);
                const data = await wxBatchGetMaterial(
                    token,
                    'image',
                    materialPage * MATERIAL_PAGE_SIZE,
                    MATERIAL_PAGE_SIZE
                );
                if (cancelled) return;
                if (data.errcode) {
                    throw new Error(data.errmsg || `错误码 ${data.errcode}`);
                }
                setMaterials(data.item || []);
                setMaterialTotal(data.total_count || 0);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    new Notice('获取素材失败：' + error.message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [appid, tab, materialPage, materialTick]);

    // 卸载时清理封面 objectURL
    useEffect(() => {
        return () => {
            Object.values(coverUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            coverUrlsRef.current = {};
        };
    }, []);

    const onTabChange = (next: Tab) => {
        setTab(next);
        setDraftPage(0);
        setMaterialPage(0);
    };

    const confirmDelete = (item: DraftBatchItem) => {
        const title = item.content?.news_item?.[0]?.title || '未命名草稿';
        new ConfirmModal(
            modal.app,
            '删除草稿',
            `确定要删除草稿「${title}」吗？此操作不可恢复。`,
            async () => {
                try {
                    if (!appid) return;
                    const token = await getToken(appid);
                    const res = await wxDraftDelete(token, item.media_id);
                    if (res.errcode && res.errcode !== 0) {
                        throw new Error(res.errmsg || `错误码 ${res.errcode}`);
                    }
                    new Notice('草稿已删除');
                    if (drafts.length === 1 && draftPage > 0) {
                        setDraftPage(page => page - 1);
                    } else {
                        setDraftTick(tick => tick + 1);
                    }
                } catch (error) {
                    console.error(error);
                    new Notice('删除草稿失败：' + error.message);
                }
            }
        ).open();
    };

    const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!appid) {
            new Notice('请先选择公众号');
            return;
        }
        if (!/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)) {
            new Notice('仅支持图片文件');
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
            new Notice('图片大小不能超过 2MB');
            return;
        }

        setUploading(true);
        try {
            const token = await getToken(appid);
            const data = new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' });
            const res = await wxUploadImage(data, file.name, token, 'image');
            if (!res.media_id) {
                throw new Error(res.errmsg || '上传失败');
            }
            new Notice('上传成功');
            setMaterialTick(tick => tick + 1);
        } catch (error) {
            console.error(error);
            new Notice('上传素材失败：' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const copyMediaId = async (mediaId: string) => {
        try {
            await navigator.clipboard.writeText(mediaId);
            new Notice('素材ID已复制');
        } catch (error) {
            console.error(error);
            new Notice('复制失败：' + error.message);
        }
    };

    const draftPages = Math.max(1, Math.ceil(draftTotal / DRAFT_PAGE_SIZE));
    const materialPages = Math.max(1, Math.ceil(materialTotal / MATERIAL_PAGE_SIZE));

    return (
        <div className={styles.Root}>
            <div className={styles.Toolbar}>
                <AccountSelect />
                <div className={styles.Tabs}>
                    <button
                        className={tab === 'draft' ? styles.TabActive : styles.Tab}
                        onClick={() => onTabChange('draft')}
                    >
                        草稿管理
                    </button>
                    <button
                        className={tab === 'material' ? styles.TabActive : styles.Tab}
                        onClick={() => onTabChange('material')}
                    >
                        永久素材管理
                    </button>
                </div>
            </div>

            <div className={styles.Body}>
                <div className={styles.Content}>
                    {!appid ? (
                        <div className={styles.Empty}>请先在设置中添加公众号账号</div>
                    ) : loading ? (
                        <div className={styles.Loading}>加载中...</div>
                    ) : tab === 'draft' ? (
                        drafts.length === 0 ? (
                            <div className={styles.Empty}>暂无草稿</div>
                        ) : (
                            <div className={styles.DraftList}>
                                {drafts.map(item => {
                                    const news = item.content?.news_item?.[0];
                                    const title = news?.title || '无标题';
                                    const digest = news?.digest || '无摘要';
                                    return (
                                        <div className={styles.DraftItem} key={item.media_id}>
                                            <div className={styles.DraftCoverWrap}>
                                                {coverUrls[item.media_id] ? (
                                                    <img
                                                        className={styles.DraftCover}
                                                        src={coverUrls[item.media_id]}
                                                        alt={title}
                                                    />
                                                ) : (
                                                    <div className={styles.DraftCoverEmpty} />
                                                )}
                                            </div>
                                            <div className={styles.DraftInfo}>
                                                <div className={styles.DraftTitle} title={title}>{title}</div>
                                                <div className={styles.DraftDigest} title={digest}>{digest}</div>
                                            </div>
                                            <button
                                                className={styles.DeleteButton}
                                                onClick={() => confirmDelete(item)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className={styles.MaterialWrap}>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={onFileSelected}
                            />
                            {materials.length === 0 ? (
                                <div className={styles.Empty}>暂无素材</div>
                            ) : (
                                <div className={styles.MaterialGrid}>
                                    {materials.map(material => (
                                        <div className={styles.MaterialItem} key={material.media_id}>
                                            <img
                                                className={styles.MaterialImage}
                                                src={material.url}
                                                alt={material.name}
                                                loading="lazy"
                                            />
                                            <div className={styles.MaterialName} title={material.name}>
                                                {material.name}
                                            </div>
                                            <button
                                                className={styles.CopyButton}
                                                onClick={() => copyMediaId(material.media_id)}
                                            >
                                                复制素材ID
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {appid && tab === 'material' && (
                    <button
                        className={styles.FloatUploadButton}
                        disabled={uploading}
                        title={uploading ? '上传中...' : '上传图片'}
                        onClick={() => fileRef.current?.click()}
                    >
                        {uploading ? (
                            <span className={styles.UploadSpinner} />
                        ) : (
                            <PlusIcon width={24} height={24} />
                        )}
                    </button>
                )}
            </div>

            <div className={styles.Footer}>
                {tab === 'draft' ? (
                    <div className={styles.Pagination}>
                        <button
                            disabled={draftPage === 0 || loading}
                            onClick={() => setDraftPage(page => page - 1)}
                        >
                            上一页
                        </button>
                        <span className={styles.PageInfo}>{draftPage + 1} / {draftPages}</span>
                        <button
                            disabled={(draftPage + 1) * DRAFT_PAGE_SIZE >= draftTotal || loading}
                            onClick={() => setDraftPage(page => page + 1)}
                        >
                            下一页
                        </button>
                    </div>
                ) : (
                    <div className={styles.Pagination}>
                        <button
                            disabled={materialPage === 0 || loading}
                            onClick={() => setMaterialPage(page => page - 1)}
                        >
                            上一页
                        </button>
                        <span className={styles.PageInfo}>{materialPage + 1} / {materialPages}</span>
                        <button
                            disabled={(materialPage + 1) * MATERIAL_PAGE_SIZE >= materialTotal || loading}
                            onClick={() => setMaterialPage(page => page + 1)}
                        >
                            下一页
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function WechatManagerContent({ modal }: { modal: Modal }) {
    const storeRef = useRef<ConfigStore>(null);
    if (!storeRef.current) {
        storeRef.current = createConfigStore();
    }

    return (
        <ConfigContext.Provider value={storeRef.current}>
            <WechatManagerInternal modal={modal} />
        </ConfigContext.Provider>
    );
}

export function createWechatManager(container: HTMLElement, modal: Modal) {
    const root = ReactDOM.createRoot(container);
    root.render(<WechatManagerContent modal={modal} />);
    return root;
}
