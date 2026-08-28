import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../models/user.entity';

const getCurrentUserByContext = (context: ExecutionContext): UserEntity => {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest().user;
  }
  if (context.getType() === 'rpc') {
    return context.switchToRpc().getData().user;
  }
  return null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getCurrentUserByContext(context),
);
