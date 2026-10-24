// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncTaskModel } from '@/database/models/asyncTask';
import { FileModel } from '@/database/models/file';
import { ContentChunk } from '@/server/modules/ContentChunk';
import { createAsyncCaller } from '@/server/routers/async';
import { AsyncTaskErrorType, AsyncTaskStatus, AsyncTaskType } from '@/types/asyncTask';

import { ChunkService } from './index';

vi.mock('@/database/models/asyncTask');
vi.mock('@/database/models/file');
vi.mock('@/server/modules/ContentChunk');
vi.mock('@/server/routers/async');

describe('ChunkService', () => {
  let service: ChunkService;
  const mockDb = {} as any;
  const mockUserId = 'test-user-id';
  let mockFileModel: any;
  let mockAsyncTaskModel: any;
  let mockChunkClient: any;
  let mockAsyncCaller: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup FileModel mock
    mockFileModel = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    (FileModel as any).mockImplementation(() => mockFileModel);

    // Setup AsyncTaskModel mock
    mockAsyncTaskModel = {
      create: vi.fn(),
      update: vi.fn(),
    };
    (AsyncTaskModel as any).mockImplementation(() => mockAsyncTaskModel);

    // Setup ContentChunk mock
    mockChunkClient = {
      chunkContent: vi.fn(),
    };
    (ContentChunk as any).mockImplementation(() => mockChunkClient);

    // Setup async caller mock
    mockAsyncCaller = {
      file: {
        embeddingChunks: vi.fn(),
        parseFileToChunks: vi.fn(),
      },
    };
    (createAsyncCaller as any).mockResolvedValue(mockAsyncCaller);

    service = new ChunkService(mockDb, mockUserId);
  });

  describe('chunkContent', () => {
    it('should chunk content successfully', async () => {
      const params = {
        content: new Uint8Array([1, 2, 3]),
        fileType: 'application/pdf',
        filename: 'test.pdf',
      };
      const mockResult = { chunks: [{ id: '1', text: 'test' }] };

      mockChunkClient.chunkContent.mockResolvedValue(mockResult);

      const result = await service.chunkContent(params);

      expect(mockChunkClient.chunkContent).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });

    it('should handle chunking errors', async () => {
      const params = {
        content: new Uint8Array([1, 2, 3]),
        fileType: 'application/pdf',
        filename: 'test.pdf',
      };
      const error = new Error('Chunking failed');

      mockChunkClient.chunkContent.mockRejectedValue(error);

      await expect(service.chunkContent(params)).rejects.toThrow('Chunking failed');
    });
  });

  describe('asyncEmbeddingFileChunks', () => {
    const fileId = 'test-file-id';
    const payload = { userId: 'test-user' } as any;
    const asyncTaskId = 'test-task-id';

    it('should return undefined if file not found', async () => {
      mockFileModel.findById.mockResolvedValue(null);

      const result = await service.asyncEmbeddingFileChunks(fileId, payload);

      expect(result).toBeUndefined();
      expect(mockFileModel.findById).toHaveBeenCalledWith(fileId);
      expect(mockAsyncTaskModel.create).not.toHaveBeenCalled();
    });

    it('should create async task and trigger embedding successfully', async () => {
      mockFileModel.findById.mockResolvedValue({ id: fileId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);
      mockAsyncCaller.file.embeddingChunks.mockResolvedValue(undefined);

      const result = await service.asyncEmbeddingFileChunks(fileId, payload);

      expect(mockFileModel.findById).toHaveBeenCalledWith(fileId);
      expect(mockAsyncTaskModel.create).toHaveBeenCalledWith({
        status: AsyncTaskStatus.Pending,
        type: AsyncTaskType.Embedding,
      });
      expect(mockFileModel.update).toHaveBeenCalledWith(fileId, {
        embeddingTaskId: asyncTaskId,
      });
      expect(createAsyncCaller).toHaveBeenCalledWith({
        jwtPayload: payload,
        userId: mockUserId,
      });
      expect(mockAsyncCaller.file.embeddingChunks).toHaveBeenCalledWith({
        fileId,
        taskId: asyncTaskId,
      });
      expect(result).toBe(asyncTaskId);
    });

    it('should handle embedding trigger error and update task status', async () => {
      const error = new Error('Trigger failed');
      mockFileModel.findById.mockResolvedValue({ id: fileId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);
      mockAsyncCaller.file.embeddingChunks.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.asyncEmbeddingFileChunks(fileId, payload);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[embeddingFileChunks] error:', error);
      expect(mockAsyncTaskModel.update).toHaveBeenCalledWith(asyncTaskId, {
        error: expect.objectContaining({
          name: AsyncTaskErrorType.TaskTriggerError,
          body: expect.objectContaining({
            detail: expect.stringContaining('trigger chunk embedding async task error'),
          }),
        }),
        status: AsyncTaskStatus.Error,
      });
      expect(result).toBe(asyncTaskId);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('asyncParseFileToChunks', () => {
    const fileId = 'test-file-id';
    const payload = { userId: 'test-user' } as any;
    const asyncTaskId = 'test-task-id';

    it('should return undefined if file not found', async () => {
      mockFileModel.findById.mockResolvedValue(null);

      const result = await service.asyncParseFileToChunks(fileId, payload);

      expect(result).toBeUndefined();
      expect(mockFileModel.findById).toHaveBeenCalledWith(fileId);
      expect(mockAsyncTaskModel.create).not.toHaveBeenCalled();
    });

    it('should skip if skipExist is true and chunkTaskId already exists', async () => {
      const existingTaskId = 'existing-task-id';
      mockFileModel.findById.mockResolvedValue({ id: fileId, chunkTaskId: existingTaskId });

      const result = await service.asyncParseFileToChunks(fileId, payload, true);

      expect(result).toBeUndefined();
      expect(mockFileModel.findById).toHaveBeenCalledWith(fileId);
      expect(mockAsyncTaskModel.create).not.toHaveBeenCalled();
    });

    it('should create new task even if chunkTaskId exists when skipExist is false', async () => {
      const existingTaskId = 'existing-task-id';
      mockFileModel.findById.mockResolvedValue({ id: fileId, chunkTaskId: existingTaskId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);
      mockAsyncCaller.file.parseFileToChunks.mockResolvedValue(undefined);

      const result = await service.asyncParseFileToChunks(fileId, payload, false);

      expect(mockAsyncTaskModel.create).toHaveBeenCalled();
      expect(result).toBe(asyncTaskId);
    });

    it('should create async task and trigger parsing successfully', async () => {
      mockFileModel.findById.mockResolvedValue({ id: fileId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);
      mockAsyncCaller.file.parseFileToChunks.mockResolvedValue(undefined);

      const result = await service.asyncParseFileToChunks(fileId, payload);

      expect(mockFileModel.findById).toHaveBeenCalledWith(fileId);
      expect(mockAsyncTaskModel.create).toHaveBeenCalledWith({
        status: AsyncTaskStatus.Processing,
        type: AsyncTaskType.Chunking,
      });
      expect(mockFileModel.update).toHaveBeenCalledWith(fileId, {
        chunkTaskId: asyncTaskId,
      });
      expect(createAsyncCaller).toHaveBeenCalledWith({
        jwtPayload: payload,
        userId: mockUserId,
      });
      expect(mockAsyncCaller.file.parseFileToChunks).toHaveBeenCalledWith({
        fileId: fileId,
        taskId: asyncTaskId,
      });
      expect(result).toBe(asyncTaskId);
    });

    it('should handle parsing trigger error and update task status', async () => {
      const error = new Error('Parse trigger failed');
      mockFileModel.findById.mockResolvedValue({ id: fileId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);

      // Mock parseFileToChunks to reject after being called
      const parsePromise = Promise.reject(error);
      mockAsyncCaller.file.parseFileToChunks.mockReturnValue(parsePromise);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.asyncParseFileToChunks(fileId, payload);

      expect(result).toBe(asyncTaskId);

      // Wait for the catch block to execute
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ParseFileToChunks] error:', error);
      expect(mockAsyncTaskModel.update).toHaveBeenCalledWith(asyncTaskId, {
        error: expect.objectContaining({
          name: AsyncTaskErrorType.TaskTriggerError,
          body: expect.objectContaining({
            detail: expect.stringContaining('trigger chunk embedding async task error'),
          }),
        }),
        status: AsyncTaskStatus.Error,
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not trigger parsing when skipExist is undefined and chunkTaskId exists', async () => {
      const existingTaskId = 'existing-task-id';
      mockFileModel.findById.mockResolvedValue({ id: fileId, chunkTaskId: existingTaskId });
      mockAsyncTaskModel.create.mockResolvedValue(asyncTaskId);
      mockAsyncCaller.file.parseFileToChunks.mockResolvedValue(undefined);

      const result = await service.asyncParseFileToChunks(fileId, payload);

      // When skipExist is undefined (falsy), it should proceed with creating a new task
      expect(mockAsyncTaskModel.create).toHaveBeenCalled();
      expect(result).toBe(asyncTaskId);
    });
  });

  describe('constructor', () => {
    it('should initialize all dependencies correctly', () => {
      const newService = new ChunkService(mockDb, mockUserId);

      expect(FileModel).toHaveBeenCalledWith(mockDb, mockUserId);
      expect(AsyncTaskModel).toHaveBeenCalledWith(mockDb, mockUserId);
      expect(ContentChunk).toHaveBeenCalled();
      expect(newService).toBeInstanceOf(ChunkService);
    });
  });
});
