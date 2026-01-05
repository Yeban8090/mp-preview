import { Notice } from 'obsidian';

export class CopyManager {
    private static preserveWhitespaceInCodeBlocks(container: HTMLElement): void {
        // WeChat editor may not keep <pre> default whitespace behavior after paste.
        // Convert spaces/tabs in code blocks to NBSP so indentation survives.
        const codeContainers = Array.from(container.querySelectorAll('pre, pre code')) as HTMLElement[];
        if (codeContainers.length === 0) return;

        const tabReplacement = '\u00A0\u00A0\u00A0\u00A0';

        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                if (!text) return;
                // Preserve newlines; only adjust spaces/tabs.
                const converted = text
                    .replace(/\t/g, tabReplacement)
                    .replace(/ /g, '\u00A0');
                if (converted !== text) node.nodeValue = converted;
                return;
            }

            for (const child of Array.from(node.childNodes)) {
                walk(child);
            }
        };

        for (const el of codeContainers) {
            walk(el);
        }
    }

    private static cleanupHtml(element: HTMLElement): string {
        // 创建克隆以避免修改原始元素
        const clone = element.cloneNode(true) as HTMLElement;

        // 移除所有的 data-* 属性
        clone.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 移除所有的 class 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
        });

        // 移除所有的 id 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('id');
        });

        // 使用 XMLSerializer 安全地转换为字符串
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);
        
        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    public static async copyToClipboard(element: HTMLElement): Promise<void> {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            const contentSection = clone.querySelector('.mp-content-section');
            if (!contentSection) {
                throw new Error('找不到内容区域');
            }

            this.preserveWhitespaceInCodeBlocks(contentSection as HTMLElement);

            // 使用新的 cleanupHtml 方法
            const cleanHtml = this.cleanupHtml(contentSection as HTMLElement);

            const clipData = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([clone.textContent || ''], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
        } catch (error) {
            new Notice('复制失败');
        }
    }
}